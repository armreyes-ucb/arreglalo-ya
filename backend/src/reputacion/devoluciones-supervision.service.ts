import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Devolucion } from '../entities/devolucion.entity.js';
import { toDevolucionPublica } from '../common/mappers/devolucion-publica.mapper.js';
import type { DevolucionPublica } from '../pagos/interfaces/devolucion-publica.interface.js';

@Injectable()
export class DevolucionesSupervisionService {
  constructor(
    @InjectRepository(Devolucion)
    private readonly devolucionRepository: Repository<Devolucion>,
  ) {}

  async listar(): Promise<DevolucionPublica[]> {
    const devoluciones = await this.devolucionRepository.find({
      order: { fechaLimite: 'ASC' },
    });
    return devoluciones.map(toDevolucionPublica);
  }
}