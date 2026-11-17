import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoReclamo } from '../common/enums/estado-reclamo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import type {
  ReporteAdministrativo,
  ReporteComisiones,
  ReporteDevoluciones,
  ReporteReclamos,
  ReporteSolicitudes,
} from './interfaces/reporte-administrativo.interface.js';

const ESTADOS_RECLAMO_ABIERTO = [
  EstadoReclamo.ABIERTO,
  EstadoReclamo.RESPONDIDO,
  EstadoReclamo.EN_REVISION_SUPERVISOR,
];
const MS_POR_HORA = 3_600_000;

interface RangoFechas {
  desde: Date | null;
  hasta: Date | null;
}

interface DatosReporte {
  rango: RangoFechas;
  solicitudes: Solicitud[];
  pagos: Pago[];
  devoluciones: Devolucion[];
  reclamos: Reclamo[];
}

/**
 * RF34c: reportes en JSON de solicitudes, comisiones, devoluciones y
 * reclamos. Se filtran por `solicitud.creada_en` porque la tabla `pago` no
 * guarda una fecha propia de creación.
 */
@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Solicitud)
    private readonly solicitudRepository: Repository<Solicitud>,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    @InjectRepository(Devolucion)
    private readonly devolucionRepository: Repository<Devolucion>,
    @InjectRepository(Reclamo)
    private readonly reclamoRepository: Repository<Reclamo>,
    private readonly configuracion: ConfiguracionService,
  ) {}

  async generar(
    desde?: string,
    hasta?: string,
  ): Promise<ReporteAdministrativo> {
    const datos = await this.cargar(desde, hasta);
    return {
      desde: desde ?? null,
      hasta: hasta ?? null,
      solicitudes: this.calcularSolicitudes(datos.solicitudes),
      comisiones: this.calcularComisiones(datos),
      devoluciones: this.calcularDevoluciones(datos.devoluciones),
      reclamos: this.calcularReclamos(datos.reclamos),
    };
  }

  async reporteSolicitudes(
    desde?: string,
    hasta?: string,
  ): Promise<ReporteSolicitudes> {
    const datos = await this.cargar(desde, hasta);
    return this.calcularSolicitudes(datos.solicitudes);
  }

  async reporteComisiones(
    desde?: string,
    hasta?: string,
  ): Promise<ReporteComisiones> {
    const datos = await this.cargar(desde, hasta);
    return this.calcularComisiones(datos);
  }

  async reporteDevoluciones(
    desde?: string,
    hasta?: string,
  ): Promise<ReporteDevoluciones> {
    const datos = await this.cargar(desde, hasta);
    return this.calcularDevoluciones(datos.devoluciones);
  }

  async reporteReclamos(
    desde?: string,
    hasta?: string,
  ): Promise<ReporteReclamos> {
    const datos = await this.cargar(desde, hasta);
    return this.calcularReclamos(datos.reclamos);
  }

  private async cargar(
    desde?: string,
    hasta?: string,
  ): Promise<DatosReporte> {
    const rango = this.resolverRango(desde, hasta);
    const consulta = this.solicitudRepository.createQueryBuilder(
      'solicitud',
    );
    if (rango.desde) {
      consulta.andWhere('solicitud.creadaEn >= :desde', {
        desde: rango.desde,
      });
    }
    if (rango.hasta) {
      consulta.andWhere('solicitud.creadaEn <= :hasta', {
        hasta: rango.hasta,
      });
    }
    const solicitudes = await consulta.getMany();
    const ids = solicitudes.map((solicitud) => solicitud.id);

    const pagos =
      ids.length === 0
        ? []
        : await this.pagoRepository.find({
            where: { solicitudId: In(ids) },
          });
    const pagoIds = pagos.map((pago) => pago.id);
    const devoluciones =
      pagoIds.length === 0
        ? []
        : await this.devolucionRepository.find({
            where: { pagoId: In(pagoIds) },
          });
    const reclamos =
      ids.length === 0
        ? []
        : await this.reclamoRepository.find({
            where: { solicitudId: In(ids) },
          });

    return { rango, solicitudes, pagos, devoluciones, reclamos };
  }

  private calcularSolicitudes(
    solicitudes: Solicitud[],
  ): ReporteSolicitudes {
    const porEstado: Partial<Record<EstadoSolicitud, number>> = {};
    for (const solicitud of solicitudes) {
      porEstado[solicitud.estado] =
        (porEstado[solicitud.estado] ?? 0) + 1;
    }
    return {
      total: solicitudes.length,
      urgentes: solicitudes.filter((solicitud) => solicitud.urgente)
        .length,
      con_trabajador: solicitudes.filter(
        (solicitud) => solicitud.trabajadorConfirmadoId !== null,
      ).length,
      sin_trabajador: solicitudes.filter(
        (solicitud) => solicitud.trabajadorConfirmadoId === null,
      ).length,
      por_estado: porEstado,
    };
  }

  private calcularComisiones(datos: DatosReporte): ReporteComisiones {
    const solicitudPorId = new Map(
      datos.solicitudes.map((solicitud) => [solicitud.id, solicitud]),
    );
    const pagoConDevolucion = new Set(
      datos.devoluciones.map((devolucion) => devolucion.pagoId),
    );

    let comisionCobrada = 0;
    let comisionDevengada = 0;
    let montoTotalAcordado = 0;
    let pagoInicialTotal = 0;
    let pagosConfirmados = 0;

    for (const pago of datos.pagos) {
      montoTotalAcordado += pago.precioTotalAcordado;
      pagoInicialTotal += pago.pagoInicial25;
      if (pago.estadoQr === EstadoQr.PAGADO) {
        pagosConfirmados += 1;
        comisionCobrada += pago.comision5;
      }

      const solicitud = solicitudPorId.get(pago.solicitudId);
      if (!solicitud) {
        continue;
      }
      const finalizada =
        solicitud.estado === EstadoSolicitud.FINALIZADA;
      const canceladaConPenalidad =
        solicitud.estado === EstadoSolicitud.CANCELADA &&
        pago.estadoQr === EstadoQr.PAGADO &&
        !pagoConDevolucion.has(pago.id);
      if (finalizada || canceladaConPenalidad) {
        comisionDevengada += pago.comision5;
      }
    }

    // Conserva la coherencia si algún dato histórico no tiene fila de pago.
    return {
      comision_cobrada: this.dinero(comisionCobrada),
      comision_devengada: this.dinero(comisionDevengada),
      pagos_confirmados: pagosConfirmados,
      monto_total_acordado: this.dinero(montoTotalAcordado),
      pago_inicial_total: this.dinero(pagoInicialTotal),
    };
  }

  private calcularDevoluciones(
    devoluciones: Devolucion[],
  ): ReporteDevoluciones {
    const porEstado: Partial<Record<EstadoDevolucion, number>> = {};
    let montoTotal = 0;
    for (const devolucion of devoluciones) {
      montoTotal += devolucion.monto;
      porEstado[devolucion.estado] =
        (porEstado[devolucion.estado] ?? 0) + 1;
    }
    return {
      total: devoluciones.length,
      monto_total: this.dinero(montoTotal),
      pendientes: porEstado[EstadoDevolucion.PENDIENTE] ?? 0,
      en_proceso: porEstado[EstadoDevolucion.EN_PROCESO] ?? 0,
      completadas: porEstado[EstadoDevolucion.COMPLETADA] ?? 0,
      por_estado: porEstado,
    };
  }

  private calcularReclamos(reclamos: Reclamo[]): ReporteReclamos {
    const porEstado: Partial<Record<EstadoReclamo, number>> = {};
    const horasSla =
      this.configuracion.get().horas_sla_supervisor;
    const ahora = Date.now();
    let abiertos = 0;
    let vencidosSla = 0;

    for (const reclamo of reclamos) {
      porEstado[reclamo.estado] =
        (porEstado[reclamo.estado] ?? 0) + 1;
      const abierto = ESTADOS_RECLAMO_ABIERTO.includes(
        reclamo.estado,
      );
      if (!abierto) {
        continue;
      }
      abiertos += 1;
      const horasTranscurridas =
        (ahora - reclamo.fechaApertura.getTime()) / MS_POR_HORA;
      if (horasTranscurridas > horasSla) {
        vencidosSla += 1;
      }
    }

    return {
      total: reclamos.length,
      abiertos,
      vencidos_sla: vencidosSla,
      por_estado: porEstado,
    };
  }

  private resolverRango(
    desde?: string,
    hasta?: string,
  ): RangoFechas {
    const inicio = desde ? this.inicioDelDia(desde) : null;
    const fin = hasta ? this.finDelDia(hasta) : null;
    if (inicio && fin && inicio.getTime() > fin.getTime()) {
      throw new BadRequestException(
        'La fecha "desde" no puede ser posterior a "hasta"',
      );
    }
    return { desde: inicio, hasta: fin };
  }

  private inicioDelDia(valor: string): Date {
    const fecha = new Date(valor);
    if (!Number.isFinite(fecha.getTime())) {
      throw new BadRequestException('Fecha "desde" inválida');
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return new Date(`${valor}T00:00:00.000Z`);
    }
    return fecha;
  }

  private finDelDia(valor: string): Date {
    const fecha = new Date(valor);
    if (!Number.isFinite(fecha.getTime())) {
      throw new BadRequestException('Fecha "hasta" inválida');
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      const siguiente = new Date(`${valor}T00:00:00.000Z`);
      siguiente.setUTCDate(siguiente.getUTCDate() + 1);
      return new Date(siguiente.getTime() - 1);
    }
    return fecha;
  }

  private dinero(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}
