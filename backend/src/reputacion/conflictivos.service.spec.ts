import { NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { EstadoClienteConflictivo } from '../common/enums/estado-cliente-conflictivo.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import { CONFIGURACION_CONFLICTIVOS_POR_DEFECTO } from '../configuracion/interfaces/configuracion-conflictivos.interface.js';
import type { ConfiguracionConflictivosService } from '../configuracion/configuracion-conflictivos.service.js';
import type { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { ClienteConflictivo as ClienteConflictivoEntidad } from '../entities/cliente-conflictivo.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
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
    reportesComprobados: 2,
    reportesPendientes: 0,
    motivo: 'Reporte anterior',
    registradoPorId: SUPERVISOR_ID,
    estado: EstadoClienteConflictivo.POTENCIAL,
    reclamosTotales: 0,
    reclamosRechazados: 0,
    cancelaciones: 0,
    periodoDias: 90,
    evidenciaCorte: null,
    fechaRegistro: new Date('2026-04-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-04-01T00:00:00.000Z'),
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

function crearConfiguracion(
  overrides: Partial<typeof CONFIGURACION_CONFLICTIVOS_POR_DEFECTO> = {},
): ConfiguracionConflictivosService {
  return {
    get: () => ({
      ...CONFIGURACION_CONFLICTIVOS_POR_DEFECTO,
      actualizado_en: new Date('2026-01-01T00:00:00.000Z'),
      actualizado_por: null,
      ...overrides,
    }),
  } as unknown as ConfiguracionConflictivosService;
}

function crearServicio(
  manager: unknown,
  repositorioConflictivos: unknown = { find: vi.fn(async () => []) },
  configuracion: ConfiguracionConflictivosService = crearConfiguracion(),
  dataSourceExtra: Partial<DataSource> = {},
): ConflictivosService {
  const dataSource = {
    transaction: vi.fn(
      async (callback: (manager: unknown) => unknown) =>
        callback(manager),
    ),
    ...dataSourceExtra,
  } as unknown as DataSource;

  return new ConflictivosService(
    dataSource,
    repositorioConflictivos as Repository<ClienteConflictivo>,
    configuracion,
  );
}

interface ConstructorConsulta {
  getRawMany: () => Promise<unknown[]>;
}

function crearConsulta(filas: unknown[]): ConstructorConsulta {
  const builder = {
    innerJoin: () => builder,
    select: () => builder,
    addSelect: () => builder,
    where: () => builder,
    andWhere: () => builder,
    groupBy: () => builder,
    getRawMany: async () => filas,
  };
  return builder;
}

function crearDataSourceDeteccion(filas: {
  reclamos?: unknown[];
  cancelaciones?: unknown[];
}): Partial<DataSource> {
  return {
    getRepository: ((entidad: unknown) =>
      entidad === Reclamo
        ? { createQueryBuilder: () => crearConsulta(filas.reclamos ?? []) }
        : entidad === HistorialEstado
          ? {
              createQueryBuilder: () =>
                crearConsulta(filas.cancelaciones ?? []),
            }
          : {}) as unknown as DataSource['getRepository'],
  };
}

function crearRepositorioDeteccion(casos: ClienteConflictivo[]) {
  return {
    find: vi.fn(async () => casos),
    create: vi.fn((datos: object) => ({ id: 'nuevo', ...datos })),
    save: vi.fn(async (valor: unknown) => valor),
  };
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
    expect(resultado.reportes_comprobados).toBe(1);
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

  it('CP34: al tercer reporte el cliente queda marcado y la advertencia no muestra sus datos', async () => {
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
      { cliente_id: CLIENTE_ID, motivo: 'Tercer reporte comprobado' },
      SUPERVISOR_ID,
    );

    expect(resultado.reportes_acumulados).toBe(3);
    expect(resultado.advertir).toBe(true);
    expect(resultado).not.toHaveProperty('nombre_completo');
    expect(resultado).not.toHaveProperty('telefono');
    expect(JSON.stringify(resultado)).not.toContain('Cliente Prueba');
    expect(JSON.stringify(resultado)).not.toContain('+59170000001');
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

  it('advierte a partir de 3 reportes comprobados', async () => {
    const repositorioConflictivos = {
      find: vi.fn(async () => [
        crearConflictivo({ id: 'a', reportesComprobados: 3 }),
        crearConflictivo({ id: 'b', reportesComprobados: 2 }),
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

  it('respeta el umbral configurable de reportes', async () => {
    const repositorioConflictivos = {
      find: vi.fn(async () => [
        crearConflictivo({ id: 'a', reportesComprobados: 4 }),
      ]),
    };
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorioConflictivos,
      crearConfiguracion({ min_reportes: 5 }),
    );

    const [caso] = await servicio.listar();

    expect(caso.advertir).toBe(false);
  });

  it('devuelve la advertencia de un cliente concreto', async () => {
    const repositorioConflictivos = {
      findOne: vi.fn(async () =>
        crearConflictivo({ reportesComprobados: 4 }),
      ),
    };
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorioConflictivos,
    );

    const resultado = await servicio.obtener(CLIENTE_ID);

    expect(resultado.advertir).toBe(true);
    expect(resultado.reportes_acumulados).toBe(2);
  });

  it('lanza NotFound si el cliente no tiene reportes', async () => {
    const servicio = crearServicio(crearManager(() => null).manager, {
      findOne: vi.fn(async () => null),
    });

    await expect(
      servicio.obtener(CLIENTE_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('detecta un caso POTENCIAL por reclamos rechazados', async () => {
    const repositorio = crearRepositorioDeteccion([]);
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorio,
      crearConfiguracion(),
      crearDataSourceDeteccion({
        reclamos: [
          {
            cliente_id: CLIENTE_ID,
            total: '3',
            rechazados: '2',
            ultima: '2026-05-01T00:00:00.000Z',
          },
        ],
      }),
    );

    const resumen = await servicio.detectar();

    expect(resumen.potenciales).toBe(1);
    expect(repositorio.save).toHaveBeenCalledTimes(1);
    const creado = repositorio.save.mock.calls[0][0] as ClienteConflictivo;
    expect(creado.estado).toBe(EstadoClienteConflictivo.POTENCIAL);
    expect(creado.reclamosRechazados).toBe(2);
  });

  it('no duplica ni reescribe un caso con las mismas evidencias', async () => {
    const motivo = '2 reclamos rechazados en 90 días';
    const existente = crearConflictivo({
      motivo,
      reclamosTotales: 3,
      reclamosRechazados: 2,
    });
    const repositorio = crearRepositorioDeteccion([existente]);
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorio,
      crearConfiguracion(),
      crearDataSourceDeteccion({
        reclamos: [
          {
            cliente_id: CLIENTE_ID,
            total: '3',
            rechazados: '2',
            ultima: '2026-05-01T00:00:00.000Z',
          },
        ],
      }),
    );

    const resumen = await servicio.detectar();

    expect(resumen.potenciales).toBe(0);
    expect(resumen.actualizados).toBe(0);
    expect(repositorio.save).not.toHaveBeenCalled();
  });

  it('conserva el estado CONFIRMADO', async () => {
    const existente = crearConflictivo({
      estado: EstadoClienteConflictivo.CONFIRMADO,
    });
    const repositorio = crearRepositorioDeteccion([existente]);
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorio,
      crearConfiguracion(),
      crearDataSourceDeteccion({
        cancelaciones: [
          {
            cliente_id: CLIENTE_ID,
            cancelaciones: '4',
            ultima: '2026-05-01T00:00:00.000Z',
          },
        ],
      }),
    );

    await servicio.detectar();

    expect(existente.estado).toBe(EstadoClienteConflictivo.CONFIRMADO);
    expect(repositorio.save).not.toHaveBeenCalled();
  });

  it('no reabre un caso desestimado sin evidencias nuevas', async () => {
    const existente = crearConflictivo({
      estado: EstadoClienteConflictivo.DESESTIMADO,
      evidenciaCorte: new Date('2026-06-01T00:00:00.000Z'),
    });
    const repositorio = crearRepositorioDeteccion([existente]);
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorio,
      crearConfiguracion(),
      crearDataSourceDeteccion({
        cancelaciones: [
          {
            cliente_id: CLIENTE_ID,
            cancelaciones: '4',
            ultima: '2026-05-01T00:00:00.000Z',
          },
        ],
      }),
    );

    const resumen = await servicio.detectar();

    expect(resumen.reabiertos).toBe(0);
    expect(existente.estado).toBe(EstadoClienteConflictivo.DESESTIMADO);
  });

  it('reabre un caso desestimado con evidencias nuevas', async () => {
    const existente = crearConflictivo({
      estado: EstadoClienteConflictivo.DESESTIMADO,
      evidenciaCorte: new Date('2026-06-01T00:00:00.000Z'),
    });
    const repositorio = crearRepositorioDeteccion([existente]);
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorio,
      crearConfiguracion(),
      crearDataSourceDeteccion({
        cancelaciones: [
          {
            cliente_id: CLIENTE_ID,
            cancelaciones: '4',
            ultima: '2026-07-01T00:00:00.000Z',
          },
        ],
      }),
    );

    const resumen = await servicio.detectar();

    expect(resumen.reabiertos).toBe(1);
    expect(existente.estado).toBe(EstadoClienteConflictivo.POTENCIAL);
  });

  it('omite la detección cuando está desactivada', async () => {
    const repositorio = crearRepositorioDeteccion([]);
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorio,
      crearConfiguracion({ deteccion_activa: false }),
    );

    const resumen = await servicio.detectar();

    expect(resumen.omitido).toBe(true);
    expect(repositorio.save).not.toHaveBeenCalled();
  });
});
