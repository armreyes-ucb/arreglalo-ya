import { describe, expect, it } from 'vitest';
import { CONFIGURACION_CONFLICTIVOS_POR_DEFECTO } from '../../configuracion/interfaces/configuracion-conflictivos.interface.js';
import {
  evaluarCriteriosConflictivo,
  hayEvidenciaPosterior,
} from './deteccion-conflictivos.js';

const CRITERIOS = {
  ...CONFIGURACION_CONFLICTIVOS_POR_DEFECTO,
  actualizado_en: new Date('2026-01-01T00:00:00.000Z'),
  actualizado_por: null,
};

function indicadores(
  overrides: Partial<Parameters<typeof evaluarCriteriosConflictivo>[0]> = {},
) {
  return {
    reclamosTotales: 0,
    reclamosRechazados: 0,
    cancelaciones: 0,
    reportesComprobados: 0,
    reportesPendientes: 0,
    ultimaEvidencia: null,
    ...overrides,
  };
}

describe('evaluarCriteriosConflictivo', () => {
  it('detecta por reclamos rechazados', () => {
    const resultado = evaluarCriteriosConflictivo(
      indicadores({ reclamosRechazados: 2 }),
      CRITERIOS,
    );
    expect(resultado.cumple).toBe(true);
    expect(resultado.motivos[0]).toContain('reclamos rechazados');
  });

  it('detecta por cancelaciones del cliente', () => {
    const resultado = evaluarCriteriosConflictivo(
      indicadores({ cancelaciones: 3 }),
      CRITERIOS,
    );
    expect(resultado.cumple).toBe(true);
    expect(resultado.motivos[0]).toContain('cancelaciones');
  });

  it('no suma reclamos y cancelaciones parciales', () => {
    const resultado = evaluarCriteriosConflictivo(
      indicadores({ reclamosRechazados: 1, cancelaciones: 2 }),
      CRITERIOS,
    );
    expect(resultado.cumple).toBe(false);
  });

  it('no detecta a un cliente debajo de los umbrales', () => {
    const resultado = evaluarCriteriosConflictivo(
      indicadores({
        reclamosRechazados: 1,
        cancelaciones: 2,
        reportesComprobados: 2,
      }),
      CRITERIOS,
    );
    expect(resultado.cumple).toBe(false);
  });

  it('un umbral en 0 desactiva el criterio', () => {
    const resultado = evaluarCriteriosConflictivo(
      indicadores({ reclamosTotales: 50, reclamosRechazados: 10 }),
      {
        ...CRITERIOS,
        min_reclamos_rechazados: 0,
        min_cancelaciones: 0,
        min_reportes: 0,
        min_reclamos_totales: 0,
      },
    );
    expect(resultado.cumple).toBe(false);
  });

  it('el criterio de reclamos totales se activa solo si el umbral es mayor a 0', () => {
    const apagado = evaluarCriteriosConflictivo(
      indicadores({ reclamosTotales: 5 }),
      CRITERIOS,
    );
    const encendido = evaluarCriteriosConflictivo(
      indicadores({ reclamosTotales: 5 }),
      { ...CRITERIOS, min_reclamos_totales: 5 },
    );
    expect(apagado.cumple).toBe(false);
    expect(encendido.cumple).toBe(true);
  });

  it('no detecta nada con la detección desactivada', () => {
    const resultado = evaluarCriteriosConflictivo(
      indicadores({ cancelaciones: 10 }),
      { ...CRITERIOS, deteccion_activa: false },
    );
    expect(resultado.cumple).toBe(false);
  });
});

describe('hayEvidenciaPosterior', () => {
  it('no reabre sin evidencia', () => {
    expect(hayEvidenciaPosterior(null, new Date('2026-01-01'))).toBe(false);
  });

  it('no reabre con evidencia anterior al corte', () => {
    expect(
      hayEvidenciaPosterior(
        new Date('2026-01-01'),
        new Date('2026-02-01'),
      ),
    ).toBe(false);
  });

  it('reabre con evidencia posterior al corte', () => {
    expect(
      hayEvidenciaPosterior(
        new Date('2026-03-01'),
        new Date('2026-02-01'),
      ),
    ).toBe(true);
  });
});
