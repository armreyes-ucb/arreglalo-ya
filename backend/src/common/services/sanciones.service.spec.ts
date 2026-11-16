import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { EstadoTrabajador } from '../enums/estado-trabajador.enum.js';
import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import { PerfilTrabajador as PerfilTrabajadorEntity } from '../../entities/perfil-trabajador.entity.js';
import { Suspension } from '../../entities/suspension.entity.js';
import { BusinessRulesService } from './business-rules.service.js';
import { SancionesService } from './sanciones.service.js';

const PERFIL_ID = '33333333-3333-4333-8333-333333333333';
const SUPERVISOR_ID = '66666666-6666-4666-8666-666666666666';

function crearPerfil(
  overrides: Partial<PerfilTrabajador> = {},
): PerfilTrabajador {
  return {
    id: PERFIL_ID,
    usuarioId: '22222222-2222-4222-8222-222222222222',
    estado: EstadoTrabajador.ACTIVO,
    ...overrides,
  } as PerfilTrabajador;
}

function crearManager(perfil: PerfilTrabajador | null, faltas = 0) {
  const manager = {
    findOne: vi.fn(async () => perfil),
    count: vi.fn(async () => faltas),
    create: vi.fn((_entidad: unknown, datos: object) => datos),
    save: vi.fn(async (_entidad: unknown, valor: unknown) => valor),
  };
  return manager;
}

describe('SancionesService - lógica centralizada de Fibonacci (RN05)', () => {
  const servicio = new SancionesService(new BusinessRulesService());

  it.each([
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 5],
    [4, 8],
    [5, 13],
    [6, 21],
  ])(
    'con %i faltas previas aplica %i días de suspensión',
    async (faltas, dias) => {
      const manager = crearManager(crearPerfil(), faltas);

      const suspension = await servicio.aplicarFalta(
        manager as never,
        PERFIL_ID,
        'Cancelación tardía',
        SUPERVISOR_ID,
      );

      expect(suspension.numeroFalta).toBe(faltas + 1);
      expect(suspension.diasFibonacci).toBe(dias);
      expect(manager.save).toHaveBeenCalledWith(
        Suspension,
        expect.objectContaining({ diasFibonacci: dias }),
      );
    },
  );

  it('deja al trabajador en estado SUSPENDIDO', async () => {
    const perfil = crearPerfil();
    const manager = crearManager(perfil);

    await servicio.aplicarFalta(
      manager as never,
      PERFIL_ID,
      'Falta comprobada',
      SUPERVISOR_ID,
    );

    expect(perfil.estado).toBe(EstadoTrabajador.SUSPENDIDO);
    expect(manager.save).toHaveBeenCalledWith(
      PerfilTrabajadorEntity,
      perfil,
    );
  });

  it('reutiliza el perfil y el número de falta ya calculados', async () => {
    const perfil = crearPerfil();
    const manager = crearManager(perfil);

    const suspension = await servicio.aplicarFalta(
      manager as never,
      PERFIL_ID,
      'Cancelación tardía',
      SUPERVISOR_ID,
      new Date(),
      { perfil, numeroFalta: 3 },
    );

    expect(manager.findOne).not.toHaveBeenCalled();
    expect(manager.count).not.toHaveBeenCalled();
    expect(suspension.numeroFalta).toBe(3);
    expect(suspension.diasFibonacci).toBe(3);
  });

  it('rechaza una falta a un trabajador inexistente', async () => {
    const manager = crearManager(null);

    await expect(
      servicio.aplicarFalta(
        manager as never,
        PERFIL_ID,
        'Falta',
        null,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza una falta a un trabajador dado de baja', async () => {
    const manager = crearManager(
      crearPerfil({ estado: EstadoTrabajador.BAJA }),
    );

    await expect(
      servicio.aplicarFalta(
        manager as never,
        PERFIL_ID,
        'Falta',
        null,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
