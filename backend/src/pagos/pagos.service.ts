import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import QRCode from 'qrcode';
import { DataSource, type EntityManager } from 'typeorm';
import { EstadoOferta } from '../common/enums/estado-oferta.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';
import { toPagoPublico } from '../common/mappers/pago-publico.mapper.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { hoyISO } from '../common/utils/fechas.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import type { PagoPublico } from './interfaces/pago-publico.interface.js';

const MINUTOS_VIGENCIA_QR = 30;

@Injectable()
export class PagosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reglas: BusinessRulesService,
  ) {}

  async crearPagoInicial(
    manager: EntityManager,
    solicitud: Solicitud,
    oferta: Oferta,
  ): Promise<Pago> {
    const ahora = new Date();
    let pago = await manager.findOne(Pago, {
      where: { solicitudId: solicitud.id },
      lock: { mode: 'pessimistic_write' },
    });

    if (pago?.estadoQr === EstadoQr.PAGADO) {
      throw new BadRequestException(
        'La solicitud ya tiene un pago confirmado',
      );
    }
    if (pago?.estadoQr === EstadoQr.DEVUELTO) {
      throw new BadRequestException(
        'La solicitud ya tiene un pago devuelto',
      );
    }
    if (
      pago?.estadoQr === EstadoQr.PENDIENTE &&
      pago.qrVenceEn !== null &&
      pago.qrVenceEn.getTime() > ahora.getTime()
    ) {
      throw new BadRequestException(
        'El QR vigente todavía no ha vencido',
      );
    }

    const calculo = this.reglas.calcularPago(
      oferta.precioEstimado,
      solicitud.urgente,
    );
    const qrVenceEn = new Date(
      ahora.getTime() + MINUTOS_VIGENCIA_QR * 60_000,
    );

    if (!pago) {
      pago = manager.create(Pago, {
        solicitudId: solicitud.id,
        precioTotalAcordado: calculo.total,
        pagoInicial25: calculo.pagoInicial25,
        parteTrabajador20: calculo.parteTrabajador20,
        comision5: calculo.comision5,
        saldo75: calculo.saldo75,
        codigoQrData: null,
        qrVenceEn,
        estadoQr: EstadoQr.PENDIENTE,
        yaPagueCliente: false,
        fechaYaPague: null,
        saldo75ConfirmadoTrabajador: false,
        fechaConfirmacionTrabajador: null,
        transferidoAlTrabajador: false,
        comprobanteTransferencia: null,
      });
    } else {
      pago.precioTotalAcordado = calculo.total;
      pago.pagoInicial25 = calculo.pagoInicial25;
      pago.parteTrabajador20 = calculo.parteTrabajador20;
      pago.comision5 = calculo.comision5;
      pago.saldo75 = calculo.saldo75;
      pago.codigoQrData = null;
      pago.qrVenceEn = qrVenceEn;
      pago.estadoQr = EstadoQr.PENDIENTE;
      pago.yaPagueCliente = false;
      pago.fechaYaPague = null;
    }

    await manager.save(Pago, pago);

    const payload = JSON.stringify({
      pago_id: pago.id,
      solicitud_id: solicitud.id,
      monto: pago.pagoInicial25,
      vence_en: qrVenceEn.toISOString(),
    });
    pago.codigoQrData = await QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
    });
    await manager.save(Pago, pago);

    return pago;
  }

  async confirmarPago(
    clienteId: string,
    pagoId: string,
  ): Promise<PagoPublico> {
    return this.dataSource.transaction(async (manager) => {
      const referencia = await manager.findOne(Pago, {
        where: { id: pagoId },
      });
      if (!referencia) {
        throw new NotFoundException('Pago no encontrado');
      }

      const solicitud = await manager.findOne(Solicitud, {
        where: { id: referencia.solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!solicitud || solicitud.clienteId !== clienteId) {
        throw new NotFoundException('Pago no encontrado');
      }

      const pago = await manager.findOne(Pago, {
        where: { id: pagoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pago) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (pago.estadoQr === EstadoQr.PAGADO) {
        return toPagoPublico(pago);
      }
      if (pago.estadoQr !== EstadoQr.PENDIENTE) {
        throw new BadRequestException(
          'El QR no está pendiente de pago',
        );
      }
      if (
        pago.qrVenceEn === null ||
        pago.qrVenceEn.getTime() <= Date.now()
      ) {
        pago.estadoQr = EstadoQr.VENCIDO;
        await manager.save(Pago, pago);
        throw new BadRequestException('El QR ha vencido');
      }
      if (solicitud.estado !== EstadoSolicitud.PENDIENTE_PAGO) {
        throw new BadRequestException(
          'La solicitud no está pendiente de pago',
        );
      }

      const oferta = await manager.findOne(Oferta, {
        where: {
          solicitudId: solicitud.id,
          estado: EstadoOferta.ELEGIDA,
        },
      });
      if (!oferta) {
        throw new BadRequestException(
          'No hay una oferta elegida para confirmar',
        );
      }

      pago.estadoQr = EstadoQr.PAGADO;
      await manager.save(Pago, pago);

      solicitud.trabajadorConfirmadoId = oferta.trabajadorId;
      solicitud.estado = EstadoSolicitud.CONFIRMADA;
      await manager.save(Solicitud, solicitud);

      await manager.update(
        Oferta,
        {
          solicitudId: solicitud.id,
          estado: EstadoOferta.ENVIADA,
        },
        { estado: EstadoOferta.CERRADA },
      );

      const historial = manager.create(HistorialEstado, {
        solicitudId: solicitud.id,
        estado: EstadoSolicitud.CONFIRMADA,
        usuarioId: clienteId,
      });
      await manager.save(HistorialEstado, historial);

      return toPagoPublico(pago);
    });
  }

  async registrarDevolucion(
    manager: EntityManager,
    pago: Pago,
    motivo: string,
  ): Promise<Devolucion> {
    const existente = await manager.findOne(Devolucion, {
      where: { pagoId: pago.id },
    });
    if (existente) {
      return existente;
    }

    const fechaLimite =
      this.reglas.calcularFechaLimiteDevolucion(new Date());
    const devolucion = manager.create(Devolucion, {
      pagoId: pago.id,
      motivo,
      monto: pago.pagoInicial25,
      fechaLimite: hoyISO(fechaLimite),
      estado: EstadoDevolucion.PENDIENTE,
    });
    await manager.save(Devolucion, devolucion);
    return devolucion;
  }
}
