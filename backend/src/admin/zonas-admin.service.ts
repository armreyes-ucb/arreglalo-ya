import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import type { ZonaPublica } from '../common/interfaces/zona-publica.interface.js';
import { toPublicZona } from '../common/mappers/zona-publica.mapper.js';
import { evaluarCobertura } from '../common/utils/cobertura.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Zona } from '../entities/zona.entity.js';
import type { ActualizarZonaDto } from './dto/actualizar-zona.dto.js';
import type { CrearZonaDto } from './dto/crear-zona.dto.js';
import type {
  CoberturaZona,
  TrabajadorCobertura,
  ZonaAdminResumen,
} from './interfaces/cobertura-zona.interface.js';

const ESTADOS_SOLICITUD_ABIERTA = [
  EstadoSolicitud.PUBLICADA,
  EstadoSolicitud.CON_OFERTAS,
];

/** RF34: mantenimiento de zonas, OTB, vecindades y cobertura. */
@Injectable()
export class ZonasAdminService {
  constructor(
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    @InjectRepository(TrabajadorZona)
    private readonly trabajadorZonaRepository: Repository<TrabajadorZona>,
    @InjectRepository(Solicitud)
    private readonly solicitudRepository: Repository<Solicitud>,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
  ) {}

  async listar(): Promise<ZonaAdminResumen[]> {
    const zonas = await this.zonaRepository.find({
      order: { nombre: 'ASC', otb: 'ASC' },
    });
    if (zonas.length === 0) {
      return [];
    }

    const [relaciones, solicitudes] = await Promise.all([
      this.trabajadorZonaRepository.find(),
      this.solicitudRepository.find({
        where: {
          zonaId: In(zonas.map((zona) => zona.id)),
          estado: In(ESTADOS_SOLICITUD_ABIERTA),
        },
      }),
    ]);

    const asignadosPorZona = new Map<number, number>();
    for (const relacion of relaciones) {
      asignadosPorZona.set(
        relacion.zonaId,
        (asignadosPorZona.get(relacion.zonaId) ?? 0) + 1,
      );
    }
    const solicitudesPorZona = new Map<number, number>();
    for (const solicitud of solicitudes) {
      solicitudesPorZona.set(
        solicitud.zonaId,
        (solicitudesPorZona.get(solicitud.zonaId) ?? 0) + 1,
      );
    }

    return zonas.map((zona) => ({
      ...toPublicZona(zona),
      trabajadores_asignados: asignadosPorZona.get(zona.id) ?? 0,
      solicitudes_abiertas: solicitudesPorZona.get(zona.id) ?? 0,
    }));
  }

  async crear(dto: CrearZonaDto): Promise<ZonaPublica> {
    const zona = this.zonaRepository.create({
      nombre: dto.nombre.trim(),
      otb: dto.otb.trim(),
      municipio: dto.municipio.trim(),
      zonasVecinas: dto.zonas_vecinas ?? [],
      activa: true,
    });
    const guardada = await this.zonaRepository.save(zona);
    return toPublicZona(guardada);
  }

  async actualizar(
    id: number,
    dto: ActualizarZonaDto,
  ): Promise<ZonaPublica> {
    const zona = await this.zonaRepository.findOne({ where: { id } });
    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
    }
    if (dto.nombre !== undefined) {
      zona.nombre = dto.nombre.trim();
    }
    if (dto.otb !== undefined) {
      zona.otb = dto.otb.trim();
    }
    if (dto.municipio !== undefined) {
      zona.municipio = dto.municipio.trim();
    }
    if (dto.zonas_vecinas !== undefined) {
      zona.zonasVecinas = dto.zonas_vecinas;
    }
    const guardada = await this.zonaRepository.save(zona);
    return toPublicZona(guardada);
  }

  async cambiarEstado(
    id: number,
    activa: boolean,
  ): Promise<ZonaAdminResumen> {
    const zona = await this.zonaRepository.findOne({ where: { id } });
    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
    }
    if (zona.activa !== activa) {
      zona.activa = activa;
      await this.zonaRepository.save(zona);
    }
    return this.resumen(zona);
  }

  async cobertura(id: number): Promise<CoberturaZona> {
    const zona = await this.zonaRepository.findOne({ where: { id } });
    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
    }

    const [relaciones, zonas, perfiles] = await Promise.all([
      this.trabajadorZonaRepository.find(),
      this.zonaRepository.find(),
      this.perfilRepository.find({ relations: { usuario: true } }),
    ]);

    const zonasPorId = new Map(zonas.map((item) => [item.id, item]));
    const zonasActivasPorTrabajador = new Map<string, Zona[]>();
    for (const relacion of relaciones) {
      const relacionZona = zonasPorId.get(relacion.zonaId);
      if (!relacionZona?.activa) {
        continue;
      }
      const actuales =
        zonasActivasPorTrabajador.get(relacion.trabajadorId) ?? [];
      actuales.push(relacionZona);
      zonasActivasPorTrabajador.set(relacion.trabajadorId, actuales);
    }

    const trabajadores: TrabajadorCobertura[] = [];
    for (const perfil of perfiles) {
      const zonasTrabajador =
        zonasActivasPorTrabajador.get(perfil.id) ?? [];
      const { distancia, motivo } = evaluarCobertura(zona, zonasTrabajador);
      if (distancia === null || motivo === null) {
        continue;
      }
      trabajadores.push({
        id: perfil.id,
        nombre_completo: perfil.usuario?.nombreCompleto ?? '',
        estado: perfil.estado,
        nivel_verificacion: perfil.nivelVerificacion,
        promedio: perfil.promedio,
        trabajos_completados: perfil.trabajosCompletados,
        especialidades: perfil.especialidades,
        distancia,
        motivo,
      });
    }

    trabajadores.sort((a, b) => {
      if (a.distancia !== b.distancia) {
        return a.distancia - b.distancia;
      }
      if (b.promedio !== a.promedio) {
        return b.promedio - a.promedio;
      }
      if (b.trabajos_completados !== a.trabajos_completados) {
        return b.trabajos_completados - a.trabajos_completados;
      }
      return a.nombre_completo.localeCompare(b.nombre_completo);
    });

    return {
      zona: toPublicZona(zona),
      asignados: relaciones.filter(
        (relacion) => relacion.zonaId === zona.id,
      ).length,
      total_cubren: trabajadores.length,
      trabajadores,
    };
  }

  async eliminar(id: number): Promise<void> {
    const zona = await this.zonaRepository.findOne({ where: { id } });
    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
    }

    const asignados = await this.trabajadorZonaRepository.count({
      where: { zonaId: id },
    });
    if (asignados > 0) {
      throw new ConflictException(
        'La zona tiene trabajadores asignados. Desactívala en lugar de eliminarla para conservar el historial.',
      );
    }

    try {
      await this.zonaRepository.remove(zona);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw new ConflictException(
          'La zona está en uso por trabajadores o solicitudes',
        );
      }
      throw error;
    }
  }

  private async resumen(zona: Zona): Promise<ZonaAdminResumen> {
    const [trabajadoresAsignados, solicitudesAbiertas] = await Promise.all([
      this.trabajadorZonaRepository.count({
        where: { zonaId: zona.id },
      }),
      this.solicitudRepository.count({
        where: {
          zonaId: zona.id,
          estado: In(ESTADOS_SOLICITUD_ABIERTA),
        },
      }),
    ]);

    return {
      ...toPublicZona(zona),
      trabajadores_asignados: trabajadoresAsignados,
      solicitudes_abiertas: solicitudesAbiertas,
    };
  }
}
