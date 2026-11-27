import type { ConfiguracionConflictivos } from '../../configuracion/interfaces/configuracion-conflictivos.interface.js';

/** Indicadores calculados a partir de la base de datos. */
export interface IndicadoresConflictivo {
  reclamosTotales: number;
  reclamosRechazados: number;
  cancelaciones: number;
  reportesComprobados: number;
  reportesPendientes: number;
  /** Fecha del reclamo o cancelación más reciente considerada. */
  ultimaEvidencia: Date | null;
}

export interface EvaluacionConflictivo {
  cumple: boolean;
  motivos: string[];
}

/**
 * RF32: un cliente es potencialmente conflictivo cuando alcanza al menos
 * uno de los umbrales activos. Los contadores se evalúan por separado; no
 * se suman reclamos, cancelaciones y reportes entre sí.
 */
export function evaluarCriteriosConflictivo(
  indicadores: IndicadoresConflictivo,
  criterios: ConfiguracionConflictivos,
): EvaluacionConflictivo {
  if (!criterios.deteccion_activa) {
    return { cumple: false, motivos: [] };
  }

  const motivos: string[] = [];

  if (
    criterios.min_reclamos_rechazados > 0 &&
    indicadores.reclamosRechazados >= criterios.min_reclamos_rechazados
  ) {
    motivos.push(
      `${indicadores.reclamosRechazados} reclamos rechazados en ${criterios.periodo_dias} días`,
    );
  }

  if (
    criterios.min_cancelaciones > 0 &&
    indicadores.cancelaciones >= criterios.min_cancelaciones
  ) {
    motivos.push(
      `${indicadores.cancelaciones} cancelaciones del cliente en ${criterios.periodo_dias} días`,
    );
  }

  const reportes =
    indicadores.reportesComprobados + indicadores.reportesPendientes;
  if (criterios.min_reportes > 0 && reportes >= criterios.min_reportes) {
    motivos.push(`${reportes} reportes acumulados`);
  }

  if (
    criterios.min_reclamos_totales > 0 &&
    indicadores.reclamosTotales >= criterios.min_reclamos_totales
  ) {
    motivos.push(
      `${indicadores.reclamosTotales} reclamos totales en ${criterios.periodo_dias} días`,
    );
  }

  return { cumple: motivos.length > 0, motivos };
}

/**
 * Evita reabrir un caso desestimado sin evidencias nuevas. Solo cuenta la
 * evidencia posterior al corte guardado al momento de la resolución.
 */
export function hayEvidenciaPosterior(
  ultimaEvidencia: Date | null,
  evidenciaCorte: Date | null,
): boolean {
  if (!ultimaEvidencia) {
    return false;
  }
  if (!evidenciaCorte) {
    return true;
  }
  return ultimaEvidencia.getTime() > evidenciaCorte.getTime();
}
