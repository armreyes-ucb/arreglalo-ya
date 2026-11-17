import type { ConfiguracionPlataforma } from './interfaces/configuracion-plataforma.interface.js';

/**
 * Valores por defecto equivalentes a las reglas RN01-RN09/RF25/F30 ya
 * implementadas. Se usan cuando todavía no existe el archivo de
 * configuración, de modo que el comportamiento no cambia.
 */
export const CONFIGURACION_POR_DEFECTO: Readonly<ConfiguracionPlataforma> =
  Object.freeze({
    comision_pct: 5,
    pago_inicial_pct: 25,
    factor_urgente: 1.1,
    minutos_vigencia_qr: 30,
    horas_cancelacion_sin_penalidad: 2,
    dias_habiles_devolucion: 3,
    horas_cierre_automatico: 48,
    dias_caducidad_solicitud: 30,
    dias_tope_urgente: 3,
    dias_pausa_maxima: 30,
    dias_pausa_baja: 60,
    dias_aviso_antecedentes: 15,
    dias_reclamo: 7,
    horas_respuesta_reclamo: 48,
    horas_sla_supervisor: 72,
  });

export const CLAVES_CONFIGURACION = Object.keys(
  CONFIGURACION_POR_DEFECTO,
) as (keyof ConfiguracionPlataforma)[];

/** Límites de validación por parámetro (además de los DTOs). */
export const LIMITES_CONFIGURACION: Record<
  keyof ConfiguracionPlataforma,
  { minimo: number; maximo: number; entero: boolean }
> = {
  comision_pct: { minimo: 0, maximo: 100, entero: false },
  pago_inicial_pct: { minimo: 0.5, maximo: 100, entero: false },
  factor_urgente: { minimo: 1, maximo: 5, entero: false },
  minutos_vigencia_qr: { minimo: 1, maximo: 1440, entero: true },
  horas_cancelacion_sin_penalidad: {
    minimo: 0,
    maximo: 168,
    entero: true,
  },
  dias_habiles_devolucion: { minimo: 0, maximo: 30, entero: true },
  horas_cierre_automatico: { minimo: 1, maximo: 720, entero: true },
  dias_caducidad_solicitud: { minimo: 1, maximo: 365, entero: true },
  dias_tope_urgente: { minimo: 1, maximo: 365, entero: true },
  dias_pausa_maxima: { minimo: 1, maximo: 365, entero: true },
  dias_pausa_baja: { minimo: 1, maximo: 365, entero: true },
  dias_aviso_antecedentes: { minimo: 0, maximo: 365, entero: true },
  dias_reclamo: { minimo: 0, maximo: 365, entero: true },
  horas_respuesta_reclamo: { minimo: 1, maximo: 720, entero: true },
  horas_sla_supervisor: { minimo: 1, maximo: 720, entero: true },
};
