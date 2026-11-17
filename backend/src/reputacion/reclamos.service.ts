import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DataSource,
  In,
  LessThanOrEqual,
  type EntityManager,
} from 'typeorm';
import { DecisionReclamo } from '../common/enums/decision-reclamo.enum.js';
import { EstadoReclamo } from '../common/enums/estado-reclamo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { toReclamoPublico } from '../common/mappers/reclamo-publico.mapper.js';
import { toSuspensionRegistrada } from '../common/mappers/suspension-registrada.mapper.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { Suspension } from '../entities/suspension.entity.js';
import type { CrearReclamoDto } from './dto/crear-reclamo.dto.js';
import type { ResolverReclamoDto } from './dto/resolver-reclamo.dto.js';
import type { ResponderReclamoDto } from './dto/responder-reclamo.dto.js';
import type { ReclamoPublico } from './interfaces/reclamo-publico.interface.js';
import type { ResolucionReclamo } from './interfaces/resolucion-reclamo.interface.js';
import {
  ESTADOS_RECLAMO_ABIERTO,
  MS_POR_HORA,
} from './reputacion.constants.js';
import { SuspensionesService } from './suspensiones.service.js';

const MS_POR_DIA = 24 * MS_POR_HORA;

@Injectable()
export class ReclamosService {
  private readonly logger = new Logger(ReclamosService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly suspensionesService: SuspensionesService,
    private readonly configuracion: ConfiguracionService,
  ) {}

  /** RF30: el cliente reclama dentro de los 7 días desde el cierre (RN07). */
  async crear(
    usuarioId: string,
    solicitudId: string,
    dto: CrearReclamoDto,
  ): Promise<ReclamoPublico> {
    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager.findOne(Solicitud, {
        where: { id: solicitudId },
      });
      if (!solicitud || solicitud.clienteId !== usuarioId) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (solicitud.estado !== EstadoSolicitud.FINALIZADA) {
        throw new BadRequestException(
          'Solo puedes reclamar un trabajo finalizado',
        );
      }

      const cierre =
        solicitud.cerradaEn ??
        (await this.obtenerFechaFinalizacion(manager, solicitud.id)) ??
        new Date();
      const diasTranscurridos = Math.floor(
        (Date.now() - cierre.getTime()) / MS_POR_DIA,
      );
      const diasMaximos = this.configuracion.get().dias_reclamo;
      if (diasTranscurridos > diasMaximos) {
        throw new BadRequestException(
          `El plazo de ${diasMaximos} días para reclamar venció`,
        );
      }

      const existente = await manager.findOne(Reclamo, {
        where: {
          solicitudId: solicitud.id,
          estado: In(ESTADOS_RECLAMO_ABIERTO),
        },
      });
      if (existente) {
        throw new BadRequestException(
          'Ya existe un reclamo abierto para este trabajo',
        );
      }

      const reclamo = manager.create(Reclamo, {
        solicitudId: solicitud.id,
        motivo: dto.motivo.trim(),
        evidenciaFotos: dto.evidencia_fotos ?? [],
        respuestaTrabajador: null,
        estado: EstadoReclamo.ABIERTO,
        resolucionSupervisor: null,
      });
      await manager.save(Reclamo, reclamo);

      return this.mapear(reclamo);
    });
  }

  /** RF30: el trabajador responde en un máximo de 48 horas. */
  async responder(
    usuarioId: string,
    reclamoId: string,
    dto: ResponderReclamoDto,
  ): Promise<ReclamoPublico> {
    return this.dataSource.transaction(async (manager) => {
      const reclamo = await manager.findOne(Reclamo, {
        where: { id: reclamoId },
      });
      if (!reclamo) {
        throw new NotFoundException('Reclamo no encontrado');
      }

      const solicitud = await manager.findOne(Solicitud, {
        where: { id: reclamo.solicitudId },
      });
      const perfil = await manager.findOne(PerfilTrabajador, {
        where: { usuarioId },
      });
      if (
        !solicitud ||
        !perfil ||
        solicitud.trabajadorConfirmadoId !== perfil.id
      ) {
        throw new ForbiddenException(
          'No eres el trabajador de este trabajo',
        );
      }

      if (reclamo.estado !== EstadoReclamo.ABIERTO) {
        throw new BadRequestException(
          'El reclamo no admite respuesta en su estado actual',
        );
      }

      const horasTranscurridas =
        (Date.now() - reclamo.fechaApertura.getTime()) /
        MS_POR_HORA;
      const horasRespuesta =
        this.configuracion.get().horas_respuesta_reclamo;
      if (horasTranscurridas > horasRespuesta) {
        throw new BadRequestException(
          `El plazo de ${horasRespuesta} horas para responder venció`,
        );
      }

      reclamo.respuestaTrabajador = dto.respuesta.trim();
      reclamo.estado = EstadoReclamo.RESPONDIDO;
      await manager.save(Reclamo, reclamo);

      return this.mapear(reclamo);
    });
  }

  /**
   * RF30: SLA operativo. A las 48 horas sin respuesta del trabajador el
   * reclamo pasa a revisión del supervisor; a las 72 horas sin resolución
   * queda marcado como vencido (campo derivado `vencido_sla`) pero puede
   * resolverse igual.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async procesarSlaProgramado(): Promise<void> {
    try {
      const movidos = await this.pasarARevisionSupervisor();
      if (movidos > 0) {
        this.logger.log(
          `Reclamos enviados a revisión por SLA: ${movidos}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'No se pudo procesar el SLA de reclamos',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async pasarARevisionSupervisor(
    ahora: Date = new Date(),
  ): Promise<number> {
    const limite = new Date(
      ahora.getTime() -
        this.configuracion.get().horas_respuesta_reclamo *
          MS_POR_HORA,
    );
    const resultado = await this.dataSource
      .getRepository(Reclamo)
      .update(
        {
          estado: EstadoReclamo.ABIERTO,
          fechaApertura: LessThanOrEqual(limite),
        },
        { estado: EstadoReclamo.EN_REVISION_SUPERVISOR },
      );
    return resultado.affected ?? 0;
  }

  /** RF30: bandeja de reclamos para el supervisor. */
  async bandeja(): Promise<ReclamoPublico[]> {
    const reclamos = await this.dataSource
      .getRepository(Reclamo)
      .find({
        where: { estado: In(ESTADOS_RECLAMO_ABIERTO) },
        order: { fechaApertura: 'ASC' },
      });
    return reclamos.map((reclamo) => this.mapear(reclamo));
  }

  /**
   * RF30 + RF31: el supervisor resuelve el reclamo; si comprueba la falta
   * del trabajador se aplica la suspensión de Fibonacci.
   */
  async resolver(
    supervisorId: string,
    reclamoId: string,
    dto: ResolverReclamoDto,
  ): Promise<ResolucionReclamo> {
    return this.dataSource.transaction(async (manager) => {
      const reclamo = await manager.findOne(Reclamo, {
        where: { id: reclamoId },
      });
      if (!reclamo) {
        throw new NotFoundException('Reclamo no encontrado');
      }
      if (!ESTADOS_RECLAMO_ABIERTO.includes(reclamo.estado)) {
        throw new BadRequestException(
          'El reclamo ya fue resuelto',
        );
      }

      const solicitud = await manager.findOne(Solicitud, {
        where: { id: reclamo.solicitudId },
      });

      let suspension: Suspension | null = null;
      if (dto.decision === DecisionReclamo.FALTA_TRABAJADOR) {
        if (!solicitud?.trabajadorConfirmadoId) {
          throw new BadRequestException(
            'La solicitud no tiene un trabajador confirmado',
          );
        }
        suspension = await this.suspensionesService.aplicarFalta(
          manager,
          solicitud.trabajadorConfirmadoId,
          `Reclamo: ${reclamo.motivo}`,
          supervisorId,
        );
        reclamo.estado = EstadoReclamo.FALTA_TRABAJADOR;
      } else {
        reclamo.estado = EstadoReclamo.RECHAZADO;
      }

      reclamo.resolucionSupervisor = dto.resolucion.trim();
      await manager.save(Reclamo, reclamo);

      return {
        reclamo: this.mapear(reclamo),
        suspension: suspension
          ? toSuspensionRegistrada(suspension)
          : null,
      };
    });
  }

  /** RF30: reclamos abiertos por el cliente autenticado. */
  async mios(usuarioId: string): Promise<ReclamoPublico[]> {
    const solicitudes = await this.dataSource
      .getRepository(Solicitud)
      .find({
        where: { clienteId: usuarioId },
        select: { id: true },
      });
    if (solicitudes.length === 0) {
      return [];
    }

    const reclamos = await this.dataSource
      .getRepository(Reclamo)
      .find({
        where: {
          solicitudId: In(solicitudes.map((solicitud) => solicitud.id)),
        },
        order: { fechaApertura: 'DESC' },
      });
    return reclamos.map((reclamo) => this.mapear(reclamo));
  }

  /** RF30: reclamos de los trabajos del trabajador autenticado. */
  async asignados(usuarioId: string): Promise<ReclamoPublico[]> {
    const perfil = await this.dataSource
      .getRepository(PerfilTrabajador)
      .findOne({ where: { usuarioId } });
    if (!perfil) {
      return [];
    }

    const solicitudes = await this.dataSource
      .getRepository(Solicitud)
      .find({
        where: { trabajadorConfirmadoId: perfil.id },
        select: { id: true },
      });
    if (solicitudes.length === 0) {
      return [];
    }

    const reclamos = await this.dataSource
      .getRepository(Reclamo)
      .find({
        where: {
          solicitudId: In(solicitudes.map((solicitud) => solicitud.id)),
        },
        order: { fechaApertura: 'DESC' },
      });
    return reclamos.map((reclamo) => this.mapear(reclamo));
  }

  /** RF34: aplica los plazos vigentes al estado derivado del reclamo. */
  private mapear(reclamo: Reclamo): ReclamoPublico {
    const configuracion = this.configuracion.get();
    return toReclamoPublico(reclamo, undefined, {
      horasRespuesta: configuracion.horas_respuesta_reclamo,
      horasSla: configuracion.horas_sla_supervisor,
    });
  }

  private async obtenerFechaFinalizacion(
    manager: EntityManager,
    solicitudId: string,
  ): Promise<Date | null> {
    const historial = await manager.findOne(HistorialEstado, {
      where: {
        solicitudId,
        estado: EstadoSolicitud.FINALIZADA,
      },
      order: { fechaHora: 'ASC' },
    });
    return historial?.fechaHora ?? null;
  }
}
