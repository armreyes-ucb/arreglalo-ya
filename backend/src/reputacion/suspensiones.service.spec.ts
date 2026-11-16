import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import type { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Suspension } from '../entities/suspension.entity.js';
import type { AplicarSuspensionDto } from './dto/aplicar-suspension.dto.js';
import { SuspensionesService } from './suspensiones.service.js';

const PERFIL_ID = '33333333-3333-4333-8333-333333333333';
const USUARIO_ID = '22222222-2222-4222-8222-222222222222';
const SUPERVISOR_ID = '66666666-6666-4666-8666-666666666666';

function crearPerfil(
  overrides: Partial<PerfilTrabajador> = {},
): PerfilTrabajador {
  return {
    id: PERFIL_ID,
    usuarioId: USUARIO_ID,
    especialidades: [],
    horarios: null,
    preciosEstimados: {},
    nivelVerificacion: 2,
    promedio: 0,
    trabajosCompletados: 0,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.ACTIVO,
    fechaPausa: null,
    venceAntecedentes: null,
    ...overrides,
  };
}

function crearSuspension(
  overrides: Partial<Suspension> = {},
): Suspension {
  return {
    id: 'suspension-1',
    trabajadorId: PERFIL_ID,
    numeroFalta: 2,
    diasFibonacci: 2,
    motivo: 'Falta comprobada',
    aplicadaPorId: SUPERVISOR_ID,
    inicio: new Date('2026-05-01T10:00:00.000Z'),
    fin: new Date('2026-05-03T10:00:00.000Z'),
    ...overrides,
  };
}

function crearManager(
  perfil: PerfilTrabajador | null,
  faltas: number,
): {
  manager: {
    findOne: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
} {
  const manager = {
    findOne: vi.fn(async () => perfil),
    count: vi.fn(async () => faltas),
    create: vi.fn((_entidad: unknown, datos: object) => ({
      id: 'suspension-nueva',
      ...datos,
    })),
    save: vi.fn(async (_entidad: unknown, valor: unknown) => valor),
  };
  return { manager };
}

function crearServicio(
  manager: unknown,
  repositorioSuspensiones: unknown = { find: vi.fn(async () => []) },
  repositorioPerfiles: unknown = {
    findOne: vi.fn(async () => crearPerfil()),
  },
): SuspensionesService {
  const dataSource = {
    transaction: vi.fn(
      async (callback: (manager: unknown) => unknown) =>
        callback(manager),
    ),
  } as unknown as DataSource;

  return new SuspensionesService(
    dataSource,
    new BusinessRulesService(),
    repositorioSuspensiones as Repository<Suspension>,
    repositorioPerfiles as Repository<PerfilTrabajador>,
  );
}

describe('SuspensionesService', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('aplica la primera falta con 1 día de suspensión (RN05)', async () => {
    const { manager } = crearManager(crearPerfil(), 0);
    const servicio = crearServicio(manager);

    const suspension = await servicio.aplicarFalta(
      manager as never,
      PERFIL_ID,
      'Canceló con menos de 2 horas',
      SUPERVISOR_ID,
    );

    expect(suspension.numeroFalta).toBe(1);
    expect(suspension.diasFibonacci).toBe(1);
    expect(manager.save).toHaveBeenCalledWith(
      Suspension,
      expect.objectContaining({ trabajadorId: PERFIL_ID }),
    );
  });

  it('aplica 5 días en la cuarta falta (CP06)', async () => {
    const { manager } = crearManager(crearPerfil(), 3);
    const servicio = crearServicio(manager);

    const suspension = await servicio.aplicarFalta(
      manager as never,
      PERFIL_ID,
      'Cuarta falta',
      SUPERVISOR_ID,
    );

    expect(suspension.numeroFalta).toBe(4);
    expect(suspension.diasFibonacci).toBe(5);
  });

  it('aplica 21 días en la séptima falta (CP06)', async () => {
    const { manager } = crearManager(crearPerfil(), 6);
    const servicio = crearServicio(manager);

    const suspension = await servicio.aplicarFalta(
      manager as never,
      PERFIL_ID,
      'Séptima falta',
      SUPERVISOR_ID,
    );

    expect(suspension.numeroFalta).toBe(7);
    expect(suspension.diasFibonacci).toBe(21);
  });

  it('deja al trabajador en estado SUSPENDIDO', async () => {
    const perfil = crearPerfil();
    const { manager } = crearManager(perfil, 0);
    const servicio = crearServicio(manager);

    await servicio.aplicarFalta(
      manager as never,
      PERFIL_ID,
      'Falta',
      SUPERVISOR_ID,
    );

    expect(perfil.estado).toBe(EstadoTrabajador.SUSPENDIDO);
    expect(manager.save).toHaveBeenCalledWith(
      expect.anything(),
      perfil,
    );
  });

  it('rechaza aplicar una falta a un trabajador inexistente', async () => {
    const { manager } = crearManager(null, 0);
    const servicio = crearServicio(manager);

    await expect(
      servicio.aplicarFalta(
        manager as never,
        PERFIL_ID,
        'Falta',
        SUPERVISOR_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza aplicar una falta a un trabajador dado de baja', async () => {
    const { manager } = crearManager(
      crearPerfil({ estado: EstadoTrabajador.BAJA }),
      0,
    );
    const servicio = crearServicio(manager);

    await expect(
      servicio.aplicarFalta(
        manager as never,
        PERFIL_ID,
        'Falta',
        SUPERVISOR_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aplica la falta desde el endpoint del supervisor', async () => {
    const { manager } = crearManager(crearPerfil(), 1);
    const servicio = crearServicio(manager);
    const dto: AplicarSuspensionDto = {
      trabajador_id: PERFIL_ID,
      motivo: 'No se presentó al trabajo',
    };

    const resultado = await servicio.aplicar(dto, SUPERVISOR_ID);

    expect(resultado.numero_falta).toBe(2);
    expect(resultado.dias_fibonacci).toBe(2);
    expect(resultado.motivo).toBe('No se presentó al trabajo');
  });

  it('marca como activa la suspensión vigente y como vencida la pasada', async () => {
    const repositorioSuspensiones = {
      find: vi.fn(async () => [
        crearSuspension({
          id: 'vigente',
          fin: new Date(Date.now() + 24 * 3_600_000),
        }),
        crearSuspension({
          id: 'vencida',
          fin: new Date(Date.now() - 24 * 3_600_000),
        }),
      ]),
    };
    const servicio = crearServicio(
      crearManager(crearPerfil(), 0).manager,
      repositorioSuspensiones,
    );

    const resultado = await servicio.listar({});

    expect(resultado[0].activa).toBe(true);
    expect(resultado[1].activa).toBe(false);
  });

  it('filtra las suspensiones por trabajador', async () => {
    const repositorioSuspensiones = { find: vi.fn(async () => []) };
    const servicio = crearServicio(
      crearManager(crearPerfil(), 0).manager,
      repositorioSuspensiones,
    );

    await servicio.listar({ trabajador_id: PERFIL_ID });

    expect(repositorioSuspensiones.find).toHaveBeenCalledWith({
      where: { trabajadorId: PERFIL_ID },
      order: { inicio: 'DESC' },
    });
  });

  it('devuelve lista vacía si el usuario no tiene perfil de trabajador', async () => {
    const servicio = crearServicio(
      crearManager(null, 0).manager,
      { find: vi.fn(async () => []) },
      { findOne: vi.fn(async () => null) },
    );

    await expect(servicio.mias(USUARIO_ID)).resolves.toEqual([]);
  });
});
