/**
 * RF32: criterios de detección de clientes conflictivos. Se expone en
 * `snake_case` para mantener la convención de la API. Un umbral en 0
 * desactiva el criterio correspondiente.
 */
export interface ConfiguracionConflictivos {
  deteccion_activa: boolean;
  periodo_dias: number;
  min_reclamos_rechazados: number;
  min_cancelaciones: number;
  min_reportes: number;
  min_reclamos_totales: number;
  actualizado_en: Date;
  actualizado_por: string | null;
}

/** Valores iniciales aprobados para la detección. */
export const CONFIGURACION_CONFLICTIVOS_POR_DEFECTO = Object.freeze({
  deteccion_activa: true,
  periodo_dias: 90,
  min_reclamos_rechazados: 2,
  min_cancelaciones: 3,
  min_reportes: 3,
  min_reclamos_totales: 0,
});
