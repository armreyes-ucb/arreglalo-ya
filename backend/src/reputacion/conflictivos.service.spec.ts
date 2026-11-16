import { NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { Rol } from '../common/enums/rol.enum.js';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import type { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { ClienteConflictivo as ClienteConflictivoEntidad } from '../entities/cliente-conflictivo.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import { ConflictivosService } from './conflictivos.service.js';

const CLIENTE_ID = '11111111-1111-4111-8111-111111111111';
const SUPERVISOR_ID = '66666666-6666-4666-8666-666666666666';

function crearUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: CLIENTE_ID,
    nombreCompleto: 'Cliente Prueba',
    telefono: '+59170000001',
    passwordHash: 'hash',
    roles: [Rol.CLIENTE],
    estado: EstadoUsuario.ACTIVO,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    aceptoTerminos: true,
    fechaRegistro: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function crearConflictivo(
  overrides: Partial<ClienteConflictivo> = {},
): ClienteConflictivo {
  return {
    id: 'conflictivo-1',
    clienteId: CLIENTE_ID,
    reportesAcumulados: 2,
    motivo: 'Reporte anterior',
    registradoPorId: SUPERVISOR_ID,
    fechaRegistro: new Date('2026-04-01T00:00:00.000Z'),
    ...overrides,
  };
}

function crearManager(
  buscar: (entidad: unknown) => unknown,
): {
  manager: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
} {
  const manager = {
    findOne: vi.fn(async (entidad: unknown) => buscar(entidad)),
    create: vi.fn((_entidad: unknown, datos: object) => ({
      id: 'conflictivo-nuevo',
      fechaRegistro: new Date('2026-05-01T00:00:00.000Z'),
      ...datos,
    })),
    save: vi.fn(async (_entidad: unknown, valor: unknown) => valor),
  };
  return { manager };
}

function crearServicio(
  manager: unknown,
  repositorioConflictivos: unknown = { find: vi.fn(async () => []) },
): ConflictivosService {
  const dataSource = {
    transaction: vi.fn(
      async (callback: (manager: unknown) => unknown) =>
        callback(manager),
    ),
  } as unknown as DataSource;

  return new ConflictivosService(
    dataSource,
    repositorioConflictivos as Repository<ClienteConflictivo>,
  );
}

describe('ConflictivosService', () => {
  it('registra el primer reporte de un cliente (RF32)', async () => {
    const { manager } = crearManager((entidad) => {
      if (entidad === Usuario) {
        return crearUsuario();
      }
      return null;
    });
    const servicio = crearServicio(manager);

    const resultado = await servicio.registrar(
      { cliente_id: CLIENTE_ID, motivo: 'No pagó el saldo' },
      SUPERVISOR_ID,
    );

    expect(resultado.reportes_acumulados).toBe(1);
    expect(resultado.advertir).toBe(false);
    expect(resultado.motivo).toBe('No pagó el saldo');
    expect(manager.save).toHaveBeenCalledWith(
      ClienteConflictivoEntidad,
      expect.objectContaining({ clienteId: CLIENTE_ID }),
    );
  });

  it('incrementa el acumulado de un cliente ya registrado', async () => {
    const existente = crearConflictivo({ reportesAcumulados: 2 });
    const { manager } = crearManager((entidad) => {
      if (entidad === Usuario) {
        return crearUsuario();
      }
      if (entidad === ClienteConflictivoEntidad) {
        return existente;
      }
      return null;
    });
    const servicio = crearServicio(manager);

    const resultado = await servicio.registrar(
      { cliente_id: CLIENTE_ID, motivo: 'Reincidencia' },
      SUPERVISOR_ID,
    );

    expect(resultado.reportes_acumulados).toBe(3);
    expect(resultado.advertir).toBe(true);
    expect(resultado.motivo).toBe('Reincidencia');
  });

  it('rechaza registrar a un usuario que no es cliente', async () => {
    const { manager } = crearManager((entidad) =>
      entidad === Usuario
        ? crearUsuario({ roles: [Rol.TRABAJADOR] })
        : null,
    );
    const servicio = crearServicio(manager);

    await expect(
      servicio.registrar(
        { cliente_id: CLIENTE_ID, motivo: 'No corresponde' },
        SUPERVISOR_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza registrar a un cliente inexistente', async () => {
    const { manager } = crearManager(() => null);
    const servicio = crearServicio(manager);

    await expect(
      servicio.registrar(
        { cliente_id: CLIENTE_ID, motivo: 'No existe' },
        SUPERVISOR_ID,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('advierte a partir de 3 reportes acumulados', async () => {
    const repositorioConflictivos = {
      find: vi.fn(async () => [
        crearConflictivo({ id: 'a', reportesAcumulados: 3 }),
        crearConflictivo({ id: 'b', reportesAcumulados: 2 }),
      ]),
    };
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorioConflictivos,
    );

    const resultado = await servicio.listar();

    expect(resultado[0].advertir).toBe(true);
    expect(resultado[1].advertir).toBe(false);
  });

  it('devuelve la advertencia de un cliente concreto', async () => {
    const repositorioConflictivos = {
      findOne: vi.fn(async () =>
        crearConflictivo({ reportesAcumulados: 4 }),
      ),
    };
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorioConflictivos,
    );

    const resultado = await servicio.obtener(CLIENTE_ID);

    expect(resultado.advertir).toBe(true);
    expect(resultado.reportes_acumulados).toBe(4);
  });

  it('lanza NotFound si el cliente no tiene reportes', async () => {
    const servicio = crearServicio(crearManager(() => null).manager, {
      findOne: vi.fn(async () => null),
    });

    await expect(
      servicio.obtener(CLIENTE_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
