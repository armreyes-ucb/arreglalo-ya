import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  MoreThan,
  Repository,
  type EntityManager,
} from 'typeorm';
import { EstadoOferta } from '../common/enums/estado-oferta.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { sumarDias } from '../common/utils/fechas.js';
import { evaluarTrabajadorParaOferta } from '../common/utils/rn10.js';
import { toOfertaPublica } from '../common/mappers/oferta-publica.mapper.js';
import {
  toOfertaConSolicitud,
  toSolicitudDetalle,
} from '../common/mappers/solicitud-detalle.mapper.js';
import { toSolicitudDisponible } from '../common/mappers/solicitud-disponible.mapper.js';
import { toSolicitudPublica } from '../common/mappers/solicitud-publica.mapper.js';
import { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Zona } from '../entities/zona.entity.js';
import { TrabajadoresService } from '../trabajadores/trabajadores.service.js';
import type { CrearOfertaDto } from './dto/crear-oferta.dto.js';
import type { CrearSolicitudDto } from './dto/crear-solicitud.dto.js';
import type { ListarDisponiblesQueryDto } from './dto/listar-disponibles-query.dto.js';
import type { OfertaConSolicitud } from './interfaces/oferta-con-solicitud.interface.js';
import type { OfertaPublica } from './interfaces/oferta-publica.interface.js';
import type { SolicitudDetalle } from './interfaces/solicitud-detalle.interface.js';
import type { SolicitudDisponible } from './interfaces/solicitud-disponible.interface.js';
import type { SolicitudPublica } from './interfaces/solicitud-publica.interface.js';

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud)
    private readonly solicitudRepository: Repository<Solicitud>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(HistorialEstado)
    private readonly historialRepository: Repository<HistorialEstado>,
    @InjectRepository(ClienteConflictivo)
    private readonly conflictivoRepository: Repository<ClienteConflictivo>,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
    @InjectRepository(TrabajadorZona)
    private readonly trabajadorZonaRepository: Repository<TrabajadorZona>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    private readonly trabajadoresService: TrabajadoresService,
    private readonly dataSource: DataSource,
  ) {}

  async crearSolicitud(
    clienteId: string,
    dto: CrearSolicitudDto,
  ): Promise<SolicitudPublica> {
    const zona = await this.zonaRepository.findOne({
      where: { id: dto.zona_id },
    });
    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
    }

    const fechaCita = new Date(dto.fecha_cita_preferida);
    if (fechaCita.getTime() <= Date.now()) {
      throw new BadRequestException(
        'La fecha de cita preferida debe ser futura',
      );
    }

    const ahora = new Date();
    const urgente = dto.urgente ?? false;
    const solicitud = this.solicitudRepository.create({
      clienteId,
      trabajadorConfirmadoId: null,
      zonaId: dto.zona_id,
      especialidad: dto.especialidad,
      tipoProblema: dto.tipo_problema,
      descripcion: dto.descripcion,
      fotosUrls: dto.fotos_urls,
      direccionOculta: dto.direccion_oculta,
      fechaCitaPreferida: fechaCita,
      urgente,
      estado: EstadoSolicitud.PUBLICADA,
      venceEn: sumarDias(ahora, 30),
      entroAlTope: urgente ? ahora : null,
      cerradaEn: null,
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Solicitud, solicitud);
      await this.registrarHistorial(
        manager,
        solicitud.id,
        EstadoSolicitud.PUBLICADA,
        clienteId,
      );
    });

    return toSolicitudPublica(solicitud, zona);
  }

  async listarDisponibles(
    usuarioId: string,
    query: ListarDisponiblesQueryDto,
  ): Promise<SolicitudDisponible[]> {
    const perfil = await this.perfilRepository.findOne({
      where: { usuarioId },
    });
    if (!perfil) {
      throw new NotFoundException(
        'No existe un perfil de trabajador para este usuario',
      );
    }
    if (perfil.especialidades.length === 0) {
      return [];
    }
    if (
      query.especialidad &&
      !perfil.especialidades.includes(query.especialidad)
    ) {
      return [];
    }

    const relaciones = await this.trabajadorZonaRepository.find({
      where: { trabajadorId: perfil.id },
    });
    if (relaciones.length === 0) {
      return [];
    }

    let zonaIds = relaciones.map((relacion) => relacion.zonaId);
    if (query.zona_id !== undefined) {
      if (!zonaIds.includes(query.zona_id)) {
        return [];
      }
      zonaIds = [query.zona_id];
    }

    const especialidades = query.especialidad
      ? [query.especialidad]
      : perfil.especialidades;

    const solicitudes = await this.solicitudRepository.find({
      where: {
        zonaId: In(zonaIds),
        especialidad: In(especialidades),
        estado: In([
          EstadoSolicitud.PUBLICADA,
          EstadoSolicitud.CON_OFERTAS,
        ]),
        venceEn: MoreThan(new Date()),
      },
      order: {
        urgente: 'DESC',
        creadaEn: 'DESC',
      },
    });
    if (solicitudes.length === 0) {
      return [];
    }

    const [zonas, conflictivos] = await Promise.all([
      this.zonaRepository.find({
        where: {
          id: In(solicitudes.map((solicitud) => solicitud.zonaId)),
        },
      }),
      this.conflictivoRepository.find({
        where: {
          clienteId: In([
            ...new Set(solicitudes.map((solicitud) => solicitud.clienteId)),
          ]),
        },
      }),
    ]);
    const zonasPorId = new Map(zonas.map((zona) => [zona.id, zona]));
    const clientesConflictivos = new Set(
      conflictivos.map((conflictivo) => conflictivo.clienteId),
    );

    return solicitudes.map((solicitud) =>
      toSolicitudDisponible(
        solicitud,
        zonasPorId.get(solicitud.zonaId) ?? null,
        clientesConflictivos.has(solicitud.clienteId),
      ),
    );
  }

  async listarMias(clienteId: string): Promise<SolicitudPublica[]> {
    const solicitudes = await this.solicitudRepository.find({
      where: { clienteId },
      order: { creadaEn: 'DESC' },
    });
    if (solicitudes.length === 0) {
      return [];
    }
    const zonas = await this.zonaRepository.find({
      where: {
        id: In([...new Set(solicitudes.map((solicitud) => solicitud.zonaId))]),
      },
    });
    const zonasPorId = new Map(zonas.map((zona) => [zona.id, zona]));
    return solicitudes.map((solicitud) =>
      toSolicitudPublica(
        solicitud,
        zonasPorId.get(solicitud.zonaId) ?? null,
      ),
    );
  }

  async obtenerDetalle(
    clienteId: string,
    solicitudId: string,
  ): Promise<SolicitudDetalle> {
    const solicitud = await this.solicitudRepository.findOne({
      where: { id: solicitudId },
    });
    if (!solicitud || solicitud.clienteId !== clienteId) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const [zona, historial, totalOfertas] = await Promise.all([
      this.zonaRepository.findOne({ where: { id: solicitud.zonaId } }),
      this.historialRepository.find({
        where: { solicitudId },
        relations: { usuario: true },
        order: { fechaHora: 'ASC' },
      }),
      this.ofertaRepository.count({ where: { solicitudId } }),
    ]);

    return toSolicitudDetalle(
      solicitud,
      zona,
      historial,
      totalOfertas,
    );
  }

  async listarMisOfertas(
    usuarioId: string,
  ): Promise<OfertaConSolicitud[]> {
    const perfil = await this.perfilRepository.findOne({
      where: { usuarioId },
    });
    if (!perfil) {
      throw new NotFoundException(
        'No existe un perfil de trabajador para este usuario',
      );
    }

    const ofertas = await this.ofertaRepository.find({
      where: { trabajadorId: perfil.id },
      order: { creadaEn: 'DESC' },
    });
    if (ofertas.length === 0) {
      return [];
    }

    const solicitudes = await this.solicitudRepository.find({
      where: {
        id: In([...new Set(ofertas.map((oferta) => oferta.solicitudId))]),
      },
    });
    const zonas = await this.zonaRepository.find({
      where: {
        id: In([
          ...new Set(solicitudes.map((solicitud) => solicitud.zonaId)),
        ]),
      },
    });
    const solicitudesPorId = new Map(
      solicitudes.map((solicitud) => [solicitud.id, solicitud]),
    );
    const zonasPorId = new Map(zonas.map((zona) => [zona.id, zona]));

    return ofertas.flatMap((oferta) => {
      const solicitud = solicitudesPorId.get(oferta.solicitudId);
      if (!solicitud) {
        return [];
      }
      return [
        toOfertaConSolicitud(
          oferta,
          solicitud,
          zonasPorId.get(solicitud.zonaId) ?? null,
        ),
      ];
    });
  }

  async crearOferta(
    usuarioId: string,
    solicitudId: string,
    dto: CrearOfertaDto,
  ): Promise<OfertaPublica> {
    const perfil = await this.perfilRepository.findOne({
      where: { usuarioId },
      relations: {
        usuario: {
          cuentaBancaria: true,
        },
      },
    });
    if (!perfil || !perfil.usuario) {
      throw new NotFoundException(
        'No existe un perfil de trabajador para este usuario',
      );
    }

    const evaluacion = evaluarTrabajadorParaOferta(
      perfil,
      Boolean(perfil.usuario.cuentaBancaria),
    );
    if (!evaluacion.puedeOfertar) {
      throw new ForbiddenException(
        evaluacion.motivo ?? 'No está habilitado para ofertar',
      );
    }

    const solicitud = await this.solicitudRepository.findOne({
      where: { id: solicitudId },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (solicitud.clienteId === usuarioId) {
      throw new ForbiddenException(
        'No puedes ofertar en tu propia solicitud',
      );
    }
    if (
      solicitud.estado !== EstadoSolicitud.PUBLICADA &&
      solicitud.estado !== EstadoSolicitud.CON_OFERTAS
    ) {
      throw new BadRequestException(
        'La solicitud ya no acepta ofertas',
      );
    }
    if (solicitud.venceEn.getTime() <= Date.now()) {
      throw new BadRequestException('La solicitud está vencida');
    }
    if (!perfil.especialidades.includes(solicitud.especialidad)) {
      throw new ForbiddenException(
        'La especialidad de la solicitud no coincide con tu perfil',
      );
    }

    const candidatos = await this.trabajadoresService.listarCandidatos(
      solicitud.zonaId,
      solicitud.especialidad,
    );
    if (!candidatos.some((candidato) => candidato.id === perfil.id)) {
      throw new ForbiddenException(
        'La solicitud no está disponible en tus zonas de trabajo',
      );
    }

    const existente = await this.ofertaRepository.findOne({
      where: {
        solicitudId,
        trabajadorId: perfil.id,
      },
    });
    if (existente) {
      throw new BadRequestException(
        'Ya enviaste una oferta para esta solicitud',
      );
    }

    const fechaPropuesta = new Date(dto.fecha_propuesta);
    const oferta = this.ofertaRepository.create({
      solicitudId,
      trabajadorId: perfil.id,
      precioEstimado: dto.precio_estimado,
      costoTransporte: dto.costo_transporte,
      fechaPropuesta,
      mensaje: dto.mensaje ?? null,
      estado: EstadoOferta.ENVIADA,
    });

    await this.dataSource.transaction(async (manager) => {
      const solicitudActual = await manager.findOne(Solicitud, {
        where: { id: solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!solicitudActual) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (
        solicitudActual.estado !== EstadoSolicitud.PUBLICADA &&
        solicitudActual.estado !== EstadoSolicitud.CON_OFERTAS
      ) {
        throw new BadRequestException(
          'La solicitud ya no acepta ofertas',
        );
      }

      await manager.save(Oferta, oferta);
      if (solicitudActual.estado === EstadoSolicitud.PUBLICADA) {
        solicitudActual.estado = EstadoSolicitud.CON_OFERTAS;
        await manager.save(Solicitud, solicitudActual);
        await this.registrarHistorial(
          manager,
          solicitudActual.id,
          EstadoSolicitud.CON_OFERTAS,
          usuarioId,
        );
      }
    });

    return toOfertaPublica(oferta);
  }

  private async registrarHistorial(
    manager: EntityManager,
    solicitudId: string,
    estado: EstadoSolicitud,
    usuarioId: string,
  ): Promise<void> {
    const historial = manager.create(HistorialEstado, {
      solicitudId,
      estado,
      usuarioId,
    });
    await manager.save(HistorialEstado, historial);
  }
}

