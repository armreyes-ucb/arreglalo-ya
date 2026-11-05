import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ZonaPublica } from '../common/interfaces/zona-publica.interface.js';
import { toPublicZona } from '../common/mappers/zona-publica.mapper.js';
import { Zona } from '../entities/zona.entity.js';

@Injectable()
export class ZonasService {
  constructor(
    @InjectRepository(Zona)
    private readonly zonaRepo: Repository<Zona>,
  ) {}

  async findAll(): Promise<ZonaPublica[]> {
    const zonas = await this.zonaRepo.find({
      order: { nombre: 'ASC', otb: 'ASC' },
    });
    return zonas.map(toPublicZona);
  }
}
