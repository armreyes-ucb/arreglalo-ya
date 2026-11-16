import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { EstadoTrabajador } from '../enums/estado-trabajador.enum.js';
import { sumarDias } from '../utils/fechas.js';
import { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import { Suspension } from '../../entities/suspension.entity.js';
import { BusinessRulesService } from './business-rules.service.js';

export interface OpcionesAplicarFalta {
  /** Perfil ya cargado por el llamador para evitar una consulta extra. */
  perfil?: PerfilTrabajador;
  /** Número de falta ya calculado por el llamador. */
  numeroFalta?: number;
}

/**
 * RN05: lógica centralizada de sanciones. La usan tanto la cancelación
 * tardía del trabajador (RN03) como la resolución de un reclamo con
 * FALTA_TRABAJADOR, para que la serie de Fibonacci se aplique siempre
 * igual: 1, 2, 3, 5, 8, 13, 21 días.
 */
@Injectable()
export class SancionesService {
  constructor(private readonly reglas: BusinessRulesService) {}

  async aplicarFalta(
    manager: EntityManager,
    trabajadorId: string,
    motivo: string,
    aplicadaPorId: string | null,
    ahora: Date = new Date(),
    opciones: OpcionesAplicarFalta = {},
  ): Promise<Suspension> {
    const perfil =
      opciones.perfil ??
      (await manager.findOne(PerfilTrabajador, {
        where: { id: trabajadorId },
      }));
    if (!perfil) {
      throw new NotFoundException('Trabajador no encontrado');
    }
    if (perfil.estado === EstadoTrabajador.BAJA) {
      throw new BadRequestException(
        'El trabajador está dado de baja y no puede ser suspendido',
      );
    }

    const numeroFalta =
      opciones.numeroFalta ??
      (await manager.count(Suspension, { where: { trabajadorId } })) + 1;
    const diasFibonacci = this.reglas.diasSuspension(numeroFalta);

    const suspension = manager.create(Suspension, {
      trabajadorId,
      numeroFalta,
      diasFibonacci,
      motivo,
      aplicadaPorId,
      inicio: ahora,
      fin: sumarDias(ahora, diasFibonacci),
    });
    await manager.save(Suspension, suspension);

    perfil.estado = EstadoTrabajador.SUSPENDIDO;
    await manager.save(PerfilTrabajador, perfil);

    return suspension;
  }
}
