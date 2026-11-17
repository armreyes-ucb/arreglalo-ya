import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import type { ZonaPublica } from '../common/interfaces/zona-publica.interface.js';
import { toPublicZona } from '../common/mappers/zona-publica.mapper.js';
import { Zona } from '../entities/zona.entity.js';
import type { ActualizarZonaDto } from './dto/actualizar-zona.dto.js';
import type { CrearZonaDto } from './dto/crear-zona.dto.js';

/** RF34: mantenimiento de zonas, OTB y vecindades. */
@Injectable()
export class ZonasAdminService {
  constructor(
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
  ) {}

  async listar(): Promise<ZonaPublica[]> {
    const zonas = await this.zonaRepository.find({
      order: { nombre: 'ASC', otb: 'ASC' },
    });
    return zonas.map(toPublicZona);
  }

  async crear(dto: CrearZonaDto): Promise<ZonaPublica> {
    const zona = this.zonaRepository.create({
      nombre: dto.nombre.trim(),
      otb: dto.otb.trim(),
      municipio: dto.municipio.trim(),
      zonasVecinas: dto.zonas_vecinas ?? [],
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

  async eliminar(id: number): Promise<void> {
    const zona = await this.zonaRepository.findOne({ where: { id } });
    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
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
}
