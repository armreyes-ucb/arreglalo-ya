import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { Rol } from '../common/enums/rol.enum.js';
import { toCalificacionPublica } from '../common/mappers/calificacion-publica.mapper.js';
import { hoyISO } from '../common/utils/fechas.js';
import { isUniqueViolation } from '../common/utils/postgres-error.js';
import { Calificacion } from '../entities/calificacion.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import type { CrearCalificacionDto } from './dto/crear-calificacion.dto.js';
import type { ComentarSolicitudDto } from './dto/comentar-solicitud.dto.js';
import type { ResponderCalificacionDto } from './dto/responder-calificacion.dto.js';
import type { CalificacionPublica } from './interfaces/calificacion-publica.interface.js';
import type {
  PromedioHabilidad,
  ResumenReputacion,
} from './interfaces/resumen-reputacion.interface.js';
import { ESTADOS_CALIFICABLES } from './reputacion.constants.js';

interface DestinatarioCalificacion {
  destinatarioId: string;
  esCalificacionATrabajador: boolean;
}

@Injectable()
export class CalificacionesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
  ) {}

  /**
   * RF28: calificación continua. Una por día y por trabajo (RN12) y solo
   * cuando el trabajo ya está confirmado con el pago del 25%.
   */
  async crear(
    usuarioId: string,
    rolActivo: Rol,
    solicitudId: string,
    dto: CrearCalificacionDto,
  ): Promise<CalificacionPublica> {
    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager.findOne(Solicitud, {
        where: { id: solicitudId },
      });
      if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (!ESTADOS_CALIFICABLES.includes(solicitud.estado)) {
        throw new BadRequestException(
          'La solicitud todavía no permite calificar',
        );
      }

      const { destinatarioId, esCalificacionATrabajador } =
        await this.resolverDestinatario(
          manager,
          solicitud,
          usuarioId,
          rolActivo,
        );

      const fecha = hoyISO();
      const existente = await manager.findOne(Calificacion, {
        where: { solicitudId: solicitud.id, autorId: usuarioId, fecha },
      });
      if (existente) {
        throw new BadRequestException(
          'Ya registraste una calificación de este trabajo hoy',
        );
      }

      const calificacion = manager.create(Calificacion, {
        solicitudId: solicitud.id,
        autorId: usuarioId,
        destinatarioId,
        estrellas: dto.estrellas,
        calidad: dto.calidad ?? null,
        puntualidad: dto.puntualidad ?? null,
        trato: dto.trato ?? null,
        precioJusto: dto.precio_justo ?? null,
        comentario: dto.comentario?.trim() || null,
        respuestaTrabajador: null,
        fecha,
      });

      try {
        await manager.save(Calificacion, calificacion);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new BadRequestException(
            'Ya registraste una calificación de este trabajo hoy',
          );
        }
        throw error;
      }

      if (esCalificacionATrabajador) {
        await this.recalcularPromedio(manager, destinatarioId);
      }

      return toCalificacionPublica(calificacion);
    });
  }

  /**
   * RF29 + CP10: agrega o actualiza el comentario de la calificación del
   * autor para esa solicitud, sin límite de días desde el cierre. Si aún
   * no existe calificación, exige las estrellas para crearla.
   */
  async comentar(
    usuarioId: string,
    rolActivo: Rol,
    solicitudId: string,
    dto: ComentarSolicitudDto,
  ): Promise<CalificacionPublica> {
    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager.findOne(Solicitud, {
        where: { id: solicitudId },
      });
      if (!solicitud) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (!ESTADOS_CALIFICABLES.includes(solicitud.estado)) {
        throw new BadRequestException(
          'La solicitud todavía no permite comentarios',
        );
      }

      const { destinatarioId, esCalificacionATrabajador } =
        await this.resolverDestinatario(
          manager,
          solicitud,
          usuarioId,
          rolActivo,
        );

      const existente = await manager.findOne(Calificacion, {
        where: { solicitudId: solicitud.id, autorId: usuarioId },
        order: { fecha: 'DESC' },
      });

      if (existente) {
        existente.comentario = dto.comentario.trim();
        await manager.save(Calificacion, existente);
        return toCalificacionPublica(existente);
      }

      if (dto.estrellas === undefined) {
        throw new BadRequestException(
          'Primero registra la calificación de este trabajo o envía las estrellas junto con el comentario',
        );
      }

      const calificacion = manager.create(Calificacion, {
        solicitudId: solicitud.id,
        autorId: usuarioId,
        destinatarioId,
        estrellas: dto.estrellas,
        calidad: dto.calidad ?? null,
        puntualidad: dto.puntualidad ?? null,
        trato: dto.trato ?? null,
        precioJusto: dto.precio_justo ?? null,
        comentario: dto.comentario.trim(),
        respuestaTrabajador: null,
        fecha: hoyISO(),
      });

      try {
        await manager.save(Calificacion, calificacion);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new BadRequestException(
            'Ya registraste una calificación de este trabajo hoy',
          );
        }
        throw error;
      }

      if (esCalificacionATrabajador) {
        await this.recalcularPromedio(manager, destinatarioId);
      }

      return toCalificacionPublica(calificacion);
    });
  }

  /** RF29: el trabajador responde públicamente a un comentario. */
  async responder(
    usuarioId: string,
    calificacionId: string,
    dto: ResponderCalificacionDto,
  ): Promise<CalificacionPublica> {
    return this.dataSource.transaction(async (manager) => {
      const calificacion = await manager.findOne(Calificacion, {
        where: { id: calificacionId },
      });
      if (!calificacion) {
        throw new NotFoundException('Calificación no encontrada');
      }
      if (calificacion.destinatarioId !== usuarioId) {
        throw new ForbiddenException(
          'Solo el destinatario de la calificación puede responderla',
        );
      }
      if (!calificacion.comentario) {
        throw new BadRequestException(
          'La calificación no tiene comentario que responder',
        );
      }
      if (calificacion.respuestaTrabajador) {
        throw new BadRequestException(
          'La calificación ya tiene una respuesta pública',
        );
      }

      calificacion.respuestaTrabajador = dto.respuesta.trim();
      await manager.save(Calificacion, calificacion);

      return toCalificacionPublica(calificacion);
    });
  }

  /** RF28: historial público de calificaciones de un trabajador. */
  async listarPorTrabajador(
    trabajadorId: string,
  ): Promise<ResumenReputacion> {
    const perfil = await this.perfilRepository.findOne({
      where: { id: trabajadorId },
    });
    if (!perfil) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    const calificaciones =
      await this.dataSource.getRepository(Calificacion).find({
        where: { destinatarioId: perfil.usuarioId },
        order: { fecha: 'DESC' },
      });

    return {
      trabajador_id: perfil.id,
      promedio: perfil.promedio,
      total_trabajos: new Set(
        calificaciones.map((calificacion) => calificacion.solicitudId),
      ).size,
      total_calificaciones: calificaciones.length,
      por_habilidad: this.promediarHabilidades(calificaciones),
      calificaciones: calificaciones.map(toCalificacionPublica),
    };
  }

  async listarEscritas(
    usuarioId: string,
  ): Promise<CalificacionPublica[]> {
    const calificaciones =
      await this.dataSource.getRepository(Calificacion).find({
        where: { autorId: usuarioId },
        order: { fecha: 'DESC' },
      });
    return calificaciones.map(toCalificacionPublica);
  }

  async listarRecibidas(
    usuarioId: string,
  ): Promise<CalificacionPublica[]> {
    const calificaciones =
      await this.dataSource.getRepository(Calificacion).find({
        where: { destinatarioId: usuarioId },
        order: { fecha: 'DESC' },
      });
    return calificaciones.map(toCalificacionPublica);
  }

  /**
   * RN12: el promedio del trabajador cuenta cada trabajo como un solo
   * voto (el promedio de sus calificaciones), no cada calificación.
   */
  async recalcularPromedio(
    manager: EntityManager,
    destinatarioId: string,
  ): Promise<void> {
    const filas = await manager
      .createQueryBuilder(Calificacion, 'calificacion')
      .select('calificacion.solicitud_id', 'solicitud_id')
      .addSelect('AVG(calificacion.estrellas)', 'promedio')
      .where('calificacion.destinatario_id = :destinatarioId', {
        destinatarioId,
      })
      .groupBy('calificacion.solicitud_id')
      .getRawMany<{ promedio: string }>();

    if (filas.length === 0) {
      return;
    }

    const suma = filas.reduce(
      (total, fila) => total + Number(fila.promedio),
      0,
    );
    const promedio = Math.round((suma / filas.length) * 100) / 100;

    await manager.update(
      PerfilTrabajador,
      { usuarioId: destinatarioId },
      { promedio },
    );
  }

  private async resolverDestinatario(
    manager: EntityManager,
    solicitud: Solicitud,
    usuarioId: string,
    rolActivo: Rol,
  ): Promise<DestinatarioCalificacion> {
    if (!solicitud.trabajadorConfirmadoId) {
      throw new BadRequestException(
        'La solicitud no tiene un trabajador confirmado',
      );
    }

    const perfil = await manager.findOne(PerfilTrabajador, {
      where: { id: solicitud.trabajadorConfirmadoId },
    });
    if (!perfil) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    if (rolActivo === Rol.CLIENTE) {
      if (solicitud.clienteId !== usuarioId) {
        throw new ForbiddenException(
          'No participas en esta solicitud',
        );
      }
      return {
        destinatarioId: perfil.usuarioId,
        esCalificacionATrabajador: true,
      };
    }

    if (rolActivo === Rol.TRABAJADOR) {
      if (perfil.usuarioId !== usuarioId) {
        throw new ForbiddenException(
          'No participas en esta solicitud',
        );
      }
      return {
        destinatarioId: solicitud.clienteId,
        esCalificacionATrabajador: false,
      };
    }

    throw new ForbiddenException(
      'Solo el cliente y el trabajador del trabajo pueden calificar',
    );
  }

  private promediarHabilidades(
    calificaciones: Calificacion[],
  ): PromedioHabilidad {
    const promediar = (
      obtener: (calificacion: Calificacion) => number | null,
    ): number | null => {
      const valores = calificaciones
        .map(obtener)
        .filter((valor): valor is number => valor !== null);
      if (valores.length === 0) {
        return null;
      }
      const suma = valores.reduce((total, valor) => total + valor, 0);
      return Math.round((suma / valores.length) * 100) / 100;
    };

    return {
      calidad: promediar((c) => c.calidad),
      puntualidad: promediar((c) => c.puntualidad),
      trato: promediar((c) => c.trato),
      precio_justo: promediar((c) => c.precioJusto),
    };
  }
}
