import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import QRCode from 'qrcode';
import { DataSource, In, type EntityManager } from 'typeorm';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';
import { EstadoOferta } from '../common/enums/estado-oferta.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoReclamo } from '../common/enums/estado-reclamo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { toPagoPublico } from '../common/mappers/pago-publico.mapper.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { hoyISO } from '../common/utils/fechas.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import type { ConfirmarPago75Dto } from './dto/confirmar-pago-75.dto.js';
import type { PagoPublico } from './interfaces/pago-publico.interface.js';
import type {
  ReportePublico,
  ResolucionPagoFinal,
} from './interfaces/resolucion-pago-final.interface.js';
import type { TransferenciaSimulada } from './interfaces/transferencia-simulada.interface.js';

const MS_POR_HORA = 3_600_000;
const ESTADOS_RECLAMO_ABIERTO = [
  EstadoReclamo.ABIERTO,
  EstadoReclamo.RESPONDIDO,
  EstadoReclamo.EN_REVISION_SUPERVISOR,
];

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly reglas: BusinessRulesService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  private get horasCierreAutomatico(): number {
    return this.configuracion.get().horas_cierre_automatico;
  }

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

    const configuracion = this.configuracion.get();
    const calculo = this.reglas.calcularPago(
      oferta.precioEstimado,
      solicitud.urgente,
      {
        comisionPct: configuracion.comision_pct,
        pagoInicialPct: configuracion.pago_inicial_pct,
        factorUrgente: configuracion.factor_urgente,
      },
    );
    const qrVenceEn = new Date(
      ahora.getTime() +
        configuracion.minutos_vigencia_qr * 60_000,
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
      // CP35: los montos ya generados no se recalculan al renovar el QR;
      // un cambio de porcentajes solo aplica a pagos nuevos.
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

  /**
   * El cliente marca que ya pagó el saldo del 75% en persona. Si el
   * trabajador ya lo había confirmado, o si ya pasaron 48 horas desde que
   * terminó el trabajo, la solicitud se finaliza en este mismo instante.
   */
  async marcarYaPague(
    clienteId: string,
    pagoId: string,
  ): Promise<ResolucionPagoFinal> {
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
      if (pago.estadoQr !== EstadoQr.PAGADO) {
        throw new BadRequestException(
          'El pago inicial del 25% no está confirmado',
        );
      }

      if (solicitud.estado === EstadoSolicitud.FINALIZADA) {
        return this.construirResolucion(
          pago,
          solicitud,
          this.transferenciaRegistrada(pago),
        );
      }
      if (solicitud.estado !== EstadoSolicitud.TERMINADA_TRABAJADOR) {
        throw new BadRequestException(
          'La solicitud no está terminada por el trabajador',
        );
      }

      if (!pago.yaPagueCliente) {
        pago.yaPagueCliente = true;
        pago.fechaYaPague = new Date();
        await manager.save(Pago, pago);
      }

      const reporte = await this.obtenerReclamoAbierto(
        manager,
        solicitud.id,
      );
      if (reporte) {
        return this.construirResolucion(
          pago,
          solicitud,
          null,
          this.toReportePublico(reporte),
        );
      }

      const fechaTerminada = await this.obtenerFechaTerminada(
        manager,
        solicitud.id,
      );
      const vencieron48Horas =
        fechaTerminada !== null &&
        fechaTerminada.getTime() +
          this.horasCierreAutomatico * MS_POR_HORA <=
          Date.now();

      if (pago.saldo75ConfirmadoTrabajador || vencieron48Horas) {
        const transferencia = await this.finalizarSolicitud(
          manager,
          solicitud,
          pago,
          clienteId,
        );
        return this.construirResolucion(
          pago,
          solicitud,
          transferencia,
        );
      }

      return this.construirResolucion(pago, solicitud);
    });
  }

  /**
   * El trabajador confirma (o reporta) la recepción del saldo del 75%.
   * Si confirma antes de que el cliente marque "Ya pagué", la solicitud
   * queda a la espera de esa marca o del cierre automático de 48 horas.
   */
  async confirmarPago75(
    usuarioId: string,
    pagoId: string,
    dto: ConfirmarPago75Dto,
  ): Promise<ResolucionPagoFinal> {
    return this.dataSource.transaction(async (manager) => {
      const perfil = await manager.findOne(PerfilTrabajador, {
        where: { usuarioId },
      });
      if (!perfil) {
        throw new NotFoundException(
          'No existe un perfil de trabajador para este usuario',
        );
      }

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
      if (
        !solicitud ||
        solicitud.trabajadorConfirmadoId !== perfil.id
      ) {
        throw new NotFoundException('Pago no encontrado');
      }

      const pago = await manager.findOne(Pago, {
        where: { id: pagoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pago) {
        throw new NotFoundException('Pago no encontrado');
      }
      if (pago.estadoQr !== EstadoQr.PAGADO) {
        throw new BadRequestException(
          'El pago inicial del 25% no está confirmado',
        );
      }

      if (solicitud.estado === EstadoSolicitud.FINALIZADA) {
        return this.construirResolucion(
          pago,
          solicitud,
          this.transferenciaRegistrada(pago),
        );
      }
      if (solicitud.estado !== EstadoSolicitud.TERMINADA_TRABAJADOR) {
        throw new BadRequestException(
          'La solicitud no está terminada por el trabajador',
        );
      }

      if (!dto.confirmado) {
        const motivo = dto.motivo?.trim();
        if (!motivo) {
          throw new BadRequestException(
            'El motivo es obligatorio cuando no se confirma el pago',
          );
        }
        const reclamo = await this.registrarReporte(
          manager,
          solicitud,
          usuarioId,
          motivo,
        );
        return this.construirResolucion(
          pago,
          solicitud,
          null,
          this.toReportePublico(reclamo),
        );
      }

      if (!pago.saldo75ConfirmadoTrabajador) {
        pago.saldo75ConfirmadoTrabajador = true;
        pago.fechaConfirmacionTrabajador = new Date();
        await manager.save(Pago, pago);
      }

      const reporte = await this.obtenerReclamoAbierto(
        manager,
        solicitud.id,
      );
      if (reporte) {
        return this.construirResolucion(
          pago,
          solicitud,
          null,
          this.toReportePublico(reporte),
        );
      }

      if (pago.yaPagueCliente) {
        const transferencia = await this.finalizarSolicitud(
          manager,
          solicitud,
          pago,
          usuarioId,
        );
        return this.construirResolucion(
          pago,
          solicitud,
          transferencia,
        );
      }

      const fechaTerminada = await this.obtenerFechaTerminada(
        manager,
        solicitud.id,
      );
      if (
        fechaTerminada !== null &&
        fechaTerminada.getTime() +
          this.horasCierreAutomatico * MS_POR_HORA <=
          Date.now()
      ) {
        const transferencia = await this.finalizarSolicitud(
          manager,
          solicitud,
          pago,
          usuarioId,
        );
        return this.construirResolucion(
          pago,
          solicitud,
          transferencia,
        );
      }

      return this.construirResolucion(pago, solicitud);
    });
  }

  /**
   * Cierre automático de trabajos terminados hace 48 horas o más cuando al
   * menos una de las partes confirmó el pago y no existe un reclamo abierto.
   */
  async cerrarPendientes48h(): Promise<number> {
    const candidatas = await this.dataSource
      .getRepository(Solicitud)
      .find({
        where: { estado: EstadoSolicitud.TERMINADA_TRABAJADOR },
      });

    let cerradas = 0;
    for (const candidata of candidatas) {
      const cerrada = await this.dataSource.transaction(
        async (manager) => {
          const solicitud = await manager.findOne(Solicitud, {
            where: { id: candidata.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (
            !solicitud ||
            solicitud.estado !== EstadoSolicitud.TERMINADA_TRABAJADOR
          ) {
            return false;
          }

          const pago = await manager.findOne(Pago, {
            where: { solicitudId: solicitud.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!pago || pago.estadoQr !== EstadoQr.PAGADO) {
            return false;
          }
          if (
            !pago.yaPagueCliente &&
            !pago.saldo75ConfirmadoTrabajador
          ) {
            return false;
          }

          const reporte = await this.obtenerReclamoAbierto(
            manager,
            solicitud.id,
          );
          if (reporte) {
            return false;
          }

          const fechaTerminada = await this.obtenerFechaTerminada(
            manager,
            solicitud.id,
          );
          if (
            !fechaTerminada ||
            fechaTerminada.getTime() +
              this.horasCierreAutomatico * MS_POR_HORA >
              Date.now()
          ) {
            return false;
          }

          await this.finalizarSolicitud(
            manager,
            solicitud,
            pago,
            solicitud.clienteId,
          );
          return true;
        },
      );
      if (cerrada) {
        cerradas += 1;
      }
    }

    return cerradas;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cerrarPendientes48hProgramado(): Promise<void> {
    try {
      const cerradas = await this.cerrarPendientes48h();
      if (cerradas > 0) {
        this.logger.log(
          `Solicitudes finalizadas automáticamente: ${cerradas}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'No se pudo ejecutar el cierre automático de 48 horas',
        error instanceof Error ? error.stack : undefined,
      );
    }
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
      this.reglas.calcularFechaLimiteDevolucion(
        new Date(),
        this.configuracion.get().dias_habiles_devolucion,
      );
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

  async registrarTransferenciaSimulada(
    manager: EntityManager,
    pago: Pago,
  ): Promise<TransferenciaSimulada> {
    const comprobante = this.generarComprobante(pago);
    pago.transferidoAlTrabajador = true;
    pago.comprobanteTransferencia = comprobante;
    await manager.save(Pago, pago);
    return {
      monto: pago.parteTrabajador20,
      comision_plataforma: pago.comision5,
      comprobante,
      simulada: true,
    };
  }

  private async finalizarSolicitud(
    manager: EntityManager,
    solicitud: Solicitud,
    pago: Pago,
    usuarioId: string,
  ): Promise<TransferenciaSimulada> {
    const transferencia = await this.registrarTransferenciaSimulada(
      manager,
      pago,
    );

    solicitud.estado = EstadoSolicitud.FINALIZADA;
    solicitud.cerradaEn = new Date();
    await manager.save(Solicitud, solicitud);

    if (solicitud.trabajadorConfirmadoId) {
      const perfil = await manager.findOne(PerfilTrabajador, {
        where: { id: solicitud.trabajadorConfirmadoId },
      });
      if (perfil) {
        perfil.trabajosCompletados += 1;
        await manager.save(PerfilTrabajador, perfil);
      }
    }

    const historial = manager.create(HistorialEstado, {
      solicitudId: solicitud.id,
      estado: EstadoSolicitud.FINALIZADA,
      usuarioId,
    });
    await manager.save(HistorialEstado, historial);

    return transferencia;
  }

  private async registrarReporte(
    manager: EntityManager,
    solicitud: Solicitud,
    usuarioId: string,
    motivo: string,
  ): Promise<Reclamo> {
    const existente = await manager.findOne(Reclamo, {
      where: { solicitudId: solicitud.id },
    });
    if (existente) {
      return existente;
    }

    const reclamo = manager.create(Reclamo, {
      solicitudId: solicitud.id,
      motivo,
      evidenciaFotos: [],
      respuestaTrabajador: null,
      estado: EstadoReclamo.EN_REVISION_SUPERVISOR,
      resolucionSupervisor: null,
    });
    await manager.save(Reclamo, reclamo);

    await this.incrementarClienteConflictivo(
      manager,
      solicitud.clienteId,
      usuarioId,
      motivo,
    );

    return reclamo;
  }

  private async incrementarClienteConflictivo(
    manager: EntityManager,
    clienteId: string,
    registradoPorId: string,
    motivo: string,
  ): Promise<void> {
    const conflictivo = await manager.findOne(ClienteConflictivo, {
      where: { clienteId },
    });
    if (conflictivo) {
      conflictivo.reportesAcumulados += 1;
      await manager.save(ClienteConflictivo, conflictivo);
      return;
    }

    const nuevo = manager.create(ClienteConflictivo, {
      clienteId,
      reportesAcumulados: 1,
      motivo,
      registradoPorId,
    });
    await manager.save(ClienteConflictivo, nuevo);
  }

  private obtenerReclamoAbierto(
    manager: EntityManager,
    solicitudId: string,
  ): Promise<Reclamo | null> {
    return manager.findOne(Reclamo, {
      where: {
        solicitudId,
        estado: In(ESTADOS_RECLAMO_ABIERTO),
      },
    });
  }

  private async obtenerFechaTerminada(
    manager: EntityManager,
    solicitudId: string,
  ): Promise<Date | null> {
    const historial = await manager.findOne(HistorialEstado, {
      where: {
        solicitudId,
        estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      },
      order: { fechaHora: 'ASC' },
    });
    return historial?.fechaHora ?? null;
  }

  private generarComprobante(pago: Pago): string {
    const identificador = pago.id.replace(/-/g, '').slice(0, 12);
    return `SIM-${identificador.toUpperCase()}-${Date.now()
      .toString(36)
      .toUpperCase()}`;
  }

  private transferenciaRegistrada(
    pago: Pago,
  ): TransferenciaSimulada | null {
    if (
      !pago.transferidoAlTrabajador ||
      pago.comprobanteTransferencia === null
    ) {
      return null;
    }
    return {
      monto: pago.parteTrabajador20,
      comision_plataforma: pago.comision5,
      comprobante: pago.comprobanteTransferencia,
      simulada: true,
    };
  }

  private construirResolucion(
    pago: Pago,
    solicitud: Solicitud,
    transferencia: TransferenciaSimulada | null = null,
    reporte: ReportePublico | null = null,
  ): ResolucionPagoFinal {
    return {
      pago: toPagoPublico(pago),
      estado_solicitud: solicitud.estado,
      transferencia,
      reporte,
    };
  }

  private toReportePublico(reclamo: Reclamo): ReportePublico {
    return { id: reclamo.id, estado: reclamo.estado };
  }
}
