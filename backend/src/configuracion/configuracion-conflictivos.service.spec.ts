import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ConfiguracionClientesConflictivos } from '../entities/configuracion-clientes-conflictivos.entity.js';
import { ConfiguracionConflictivosService } from './configuracion-conflictivos.service.js';

const ADMIN_ID = '99999999-9999-4999-8999-999999999999';

function crearFila(
  overrides: Partial<ConfiguracionClientesConflictivos> = {},
): ConfiguracionClientesConflictivos {
  return {
    id: 1,
    deteccionActiva: true,
    periodoDias: 90,
    minReclamosRechazados: 2,
    minCancelaciones: 3,
    minReportes: 3,
    minReclamosTotales: 0,
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoPorId: null,
    ...overrides,
  };
}

function crearRepositorio(fila: ConfiguracionClientesConflictivos) {
  return {
    findOne: vi.fn(async () => fila),
    create: vi.fn((datos: object) => ({ ...fila, ...datos })),
    save: vi.fn(async (valor: object) => valor),
  } as unknown as Repository<ConfiguracionClientesConflictivos>;
}

describe('ConfiguracionConflictivosService', () => {
  it('expone los valores por defecto antes de cargar la fila', () => {
    const servicio = new ConfiguracionConflictivosService(
      crearRepositorio(crearFila()),
    );

    const configuracion = servicio.get();

    expect(configuracion.min_reclamos_rechazados).toBe(2);
    expect(configuracion.min_cancelaciones).toBe(3);
    expect(configuracion.deteccion_activa).toBe(true);
  });

  it('carga la configuración persistida al iniciar', async () => {
    const servicio = new ConfiguracionConflictivosService(
      crearRepositorio(crearFila({ minCancelaciones: 4 })),
    );

    await servicio.onModuleInit();

    expect(servicio.get().min_cancelaciones).toBe(4);
  });

  it('actualiza solo los criterios enviados y registra al administrador', async () => {
    const repositorio = crearRepositorio(crearFila());
    const servicio = new ConfiguracionConflictivosService(repositorio);
    await servicio.onModuleInit();

    const resultado = await servicio.actualizar(
      { min_cancelaciones: 5, periodo_dias: 30 },
      ADMIN_ID,
    );

    expect(resultado.min_cancelaciones).toBe(5);
    expect(resultado.periodo_dias).toBe(30);
    expect(resultado.min_reclamos_rechazados).toBe(2);
    expect(resultado.actualizado_por).toBe(ADMIN_ID);
    expect(repositorio.save).toHaveBeenCalled();
  });

  it('rechaza dejar la detección activa sin ningún criterio', async () => {
    const servicio = new ConfiguracionConflictivosService(
      crearRepositorio(crearFila()),
    );
    await servicio.onModuleInit();

    await expect(
      servicio.actualizar(
        {
          min_reclamos_rechazados: 0,
          min_cancelaciones: 0,
          min_reportes: 0,
          min_reclamos_totales: 0,
        },
        ADMIN_ID,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite desactivar la detección con todos los umbrales en cero', async () => {
    const servicio = new ConfiguracionConflictivosService(
      crearRepositorio(crearFila()),
    );
    await servicio.onModuleInit();

    const resultado = await servicio.actualizar(
      {
        deteccion_activa: false,
        min_reclamos_rechazados: 0,
        min_cancelaciones: 0,
        min_reportes: 0,
        min_reclamos_totales: 0,
      },
      ADMIN_ID,
    );

    expect(resultado.deteccion_activa).toBe(false);
  });
});
