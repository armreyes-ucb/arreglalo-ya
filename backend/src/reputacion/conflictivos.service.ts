import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Rol } from '../common/enums/rol.enum.js';
import { toClienteConflictivoPublico } from '../common/mappers/cliente-conflictivo-publico.mapper.js';
import { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import type { RegistrarConflictivoDto } from './dto/registrar-conflictivo.dto.js';
import type { ClienteConflictivoPublico } from './interfaces/cliente-conflictivo-publico.interface.js';

@Injectable()
export class ConflictivosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ClienteConflictivo)
    private readonly conflictivoRepository: Repository<ClienteConflictivo>,
  ) {}

  /** RF32: listado de clientes con reportes acumulados. */
  async listar(): Promise<ClienteConflictivoPublico[]> {
    const conflictivos = await this.conflictivoRepository.find({
      order: { reportesAcumulados: 'DESC' },
    });
    return conflictivos.map(toClienteConflictivoPublico);
  }

  /** RF32: advertencia puntual para el trabajador. */
  async obtener(clienteId: string): Promise<ClienteConflictivoPublico> {
    const conflictivo = await this.conflictivoRepository.findOne({
      where: { clienteId },
    });
    if (!conflictivo) {
      throw new NotFoundException(
        'El cliente no tiene reportes registrados',
      );
    }
    return toClienteConflictivoPublico(conflictivo);
  }

  /**
   * RF32: registra un reporte comprobado. Si el cliente ya existe se
   * incrementa el acumulado y se conserva el motivo más reciente.
   */
  async registrar(
    dto: RegistrarConflictivoDto,
    supervisorId: string,
  ): Promise<ClienteConflictivoPublico> {
    return this.dataSource.transaction(async (manager) => {
      const cliente = await manager.findOne(Usuario, {
        where: { id: dto.cliente_id },
      });
      if (!cliente || !cliente.roles.includes(Rol.CLIENTE)) {
        throw new NotFoundException('Cliente no encontrado');
      }

      const existente = await manager.findOne(ClienteConflictivo, {
        where: { clienteId: dto.cliente_id },
      });

      if (existente) {
        existente.reportesAcumulados += 1;
        existente.motivo = dto.motivo.trim();
        existente.registradoPorId = supervisorId;
        await manager.save(ClienteConflictivo, existente);
        return toClienteConflictivoPublico(existente);
      }

      const nuevo = manager.create(ClienteConflictivo, {
        clienteId: dto.cliente_id,
        reportesAcumulados: 1,
        motivo: dto.motivo.trim(),
        registradoPorId: supervisorId,
      });
      await manager.save(ClienteConflictivo, nuevo);
      return toClienteConflictivoPublico(nuevo);
    });
  }
}
