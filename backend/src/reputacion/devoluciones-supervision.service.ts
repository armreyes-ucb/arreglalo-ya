import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { toDevolucionConSaldo } from '../common/mappers/devolucion-publica.mapper.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import {
  calcularSaldoDevoluciones,
  redondearMonto,
} from '../common/utils/devoluciones.js';
import { hoyISO } from '../common/utils/fechas.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { Pago } from '../entities/pago.entity.js';
import type {
  DevolucionConSaldoPublica,
  PagoConSaldoPublica,
} from '../pagos/interfaces/devolucion-publica.interface.js';
import type { RegistrarDevolucionDto } from './dto/registrar-devolucion.dto.js';

@Injectable()
export class DevolucionesSupervisionService {
  constructor(
    @InjectRepository(Devolucion)
    private readonly devolucionRepository: Repository<Devolucion>,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    private readonly dataSource: DataSource,
    private readonly reglas: BusinessRulesService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  /** Historial de devoluciones (parciales o totales) con su saldo por pago. */
  async listar(): Promise<DevolucionConSaldoPublica[]> {
    const devoluciones = await this.devolucionRepository.find({
      order: { fechaLimite: 'ASC' },
    });
    if (devoluciones.length === 0) {
      return [];
    }

    const pagos = await this.pagoRepository.find({
      where: {
        id: In([
          ...new Set(devoluciones.map((devolucion) => devolucion.pagoId)),
        ]),
      },
    });
    const pagosPorId = new Map(pagos.map((pago) => [pago.id, pago]));

    const totalesPorPago = this.agruparMontos(devoluciones);

    return devoluciones.map((devolucion) => {
      const pago = pagosPorId.get(devolucion.pagoId);
      const montoOriginal = pago?.pagoInicial25 ?? 0;
      return toDevolucionConSaldo(
        devolucion,
        montoOriginal,
        totalesPorPago.get(devolucion.pagoId) ?? devolucion.monto,
      );
    });
  }

  /** Pagos confirmados sobre los que se pueden registrar devoluciones. */
  async listarPagos(): Promise<PagoConSaldoPublica[]> {
    const pagos = await this.pagoRepository.find({
      where: { estadoQr: EstadoQr.PAGADO },
      relations: { solicitud: true },
    });
    if (pagos.length === 0) {
      return [];
    }

    const devoluciones = await this.devolucionRepository.find({
      where: { pagoId: In(pagos.map((pago) => pago.id)) },
    });
    const totalesPorPago = this.agruparMontos(devoluciones);

    return pagos
      .map((pago) => {
        const totalDevuelto = totalesPorPago.get(pago.id) ?? 0;
        const { saldoDisponible } = calcularSaldoDevoluciones(
          pago.pagoInicial25,
          [totalDevuelto],
        );
        return {
          pago_id: pago.id,
          solicitud_id: pago.solicitudId,
          cliente_id: pago.solicitud?.clienteId ?? '',
          estado_qr: pago.estadoQr,
          monto_original: redondearMonto(pago.pagoInicial25),
          total_devuelto: totalDevuelto,
          saldo_disponible: saldoDisponible,
          creada_en: pago.solicitud?.creadaEn
            ? pago.solicitud.creadaEn.toISOString()
            : null,
        };
      })
      .sort((a, b) => {
        const fechaA = a.creada_en ?? '';
        const fechaB = b.creada_en ?? '';
        return fechaB.localeCompare(fechaA);
      });
  }

  /**
   * Registra una devolución parcial. El monto acumulado de todas las
   * devoluciones del pago no puede superar el importe original (pago
   * inicial del 25%). El bloqueo pesimista evita sobre-devoluciones si dos
   * supervisores registran a la vez.
   */
  async registrar(
    dto: RegistrarDevolucionDto,
  ): Promise<DevolucionConSaldoPublica> {
    return this.dataSource.transaction(async (manager) => {
      const pago = await manager.findOne(Pago, {
        where: { id: dto.pago_id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pago) {
        throw new NotFoundException('Pago no encontrado');
      }
      if (pago.estadoQr !== EstadoQr.PAGADO) {
        throw new BadRequestException(
          'El pago no está confirmado: no hay importe reembolsable',
        );
      }

      const devoluciones = await manager.find(Devolucion, {
        where: { pagoId: pago.id },
      });
      const { totalDevuelto, saldoDisponible } = calcularSaldoDevoluciones(
        pago.pagoInicial25,
        devoluciones.map((devolucion) => devolucion.monto),
      );

      const monto = redondearMonto(dto.monto);
      if (!Number.isFinite(monto) || monto <= 0) {
        throw new BadRequestException(
          'El monto de la devolución debe ser mayor a 0',
        );
      }
      if (monto > saldoDisponible) {
        throw new BadRequestException(
          `La devolución de Bs ${monto.toFixed(2)} supera el saldo disponible de Bs ${saldoDisponible.toFixed(2)} (importe original Bs ${pago.pagoInicial25.toFixed(2)})`,
        );
      }

      const fechaLimite = this.reglas.calcularFechaLimiteDevolucion(
        new Date(),
        this.configuracion.get().dias_habiles_devolucion,
      );
      const devolucion = manager.create(Devolucion, {
        pagoId: pago.id,
        motivo: dto.motivo.trim(),
        monto,
        fechaLimite: hoyISO(fechaLimite),
        estado: EstadoDevolucion.PENDIENTE,
      });
      await manager.save(Devolucion, devolucion);

      return toDevolucionConSaldo(
        devolucion,
        pago.pagoInicial25,
        redondearMonto(totalDevuelto + monto),
      );
    });
  }

  private agruparMontos(devoluciones: Devolucion[]): Map<string, number> {
    const totales = new Map<string, number>();
    for (const devolucion of devoluciones) {
      totales.set(
        devolucion.pagoId,
        redondearMonto(
          (totales.get(devolucion.pagoId) ?? 0) + devolucion.monto,
        ),
      );
    }
    return totales;
  }
}
