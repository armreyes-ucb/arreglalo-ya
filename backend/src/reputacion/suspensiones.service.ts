import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, Repository } from 'typeorm';
import { toSuspensionRegistrada } from '../common/mappers/suspension-registrada.mapper.js';
import { SancionesService } from '../common/services/sanciones.service.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Suspension } from '../entities/suspension.entity.js';
import type { AplicarSuspensionDto } from './dto/aplicar-suspension.dto.js';
import type { ListarSuspensionesQueryDto } from './dto/listar-suspensiones-query.dto.js';
import type { SuspensionRegistrada } from './interfaces/suspension-registrada.interface.js';

@Injectable()
export class SuspensionesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sanciones: SancionesService,
    @InjectRepository(Suspension)
    private readonly suspensionRepository: Repository<Suspension>,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
  ) {}

  /**
   * RN05: aplica la siguiente falta del trabajador con los días de la
   * serie de Fibonacci y lo deja en estado SUSPENDIDO hasta el vencimiento.
   * Reutilizable dentro de una transacción abierta por otro servicio.
   */
  aplicarFalta(
    manager: EntityManager,
    trabajadorId: string,
    motivo: string,
    aplicadaPorId: string | null,
    ahora: Date = new Date(),
  ): Promise<Suspension> {
    return this.sanciones.aplicarFalta(
      manager,
      trabajadorId,
      motivo,
      aplicadaPorId,
      ahora,
    );
  }

  /** RF31: el supervisor aplica una falta comprobada. */
  async aplicar(
    dto: AplicarSuspensionDto,
    supervisorId: string,
  ): Promise<SuspensionRegistrada> {
    return this.dataSource.transaction(async (manager) => {
      const suspension = await this.aplicarFalta(
        manager,
        dto.trabajador_id,
        dto.motivo,
        supervisorId,
      );
      return toSuspensionRegistrada(suspension);
    });
  }

  /** RF31: bandeja de sanciones para el supervisor. */
  async listar(
    query: ListarSuspensionesQueryDto,
  ): Promise<SuspensionRegistrada[]> {
    const suspensiones = await this.suspensionRepository.find({
      where: query.trabajador_id
        ? { trabajadorId: query.trabajador_id }
        : {},
      order: { inicio: 'DESC' },
    });
    return suspensiones.map((suspension) =>
      toSuspensionRegistrada(suspension),
    );
  }

  /** RF31: historial de sanciones del trabajador autenticado. */
  async mias(usuarioId: string): Promise<SuspensionRegistrada[]> {
    const perfil = await this.perfilRepository.findOne({
      where: { usuarioId },
    });
    if (!perfil) {
      return [];
    }
    const suspensiones = await this.suspensionRepository.find({
      where: { trabajadorId: perfil.id },
      order: { inicio: 'DESC' },
    });
    return suspensiones.map((suspension) =>
      toSuspensionRegistrada(suspension),
    );
  }
}
