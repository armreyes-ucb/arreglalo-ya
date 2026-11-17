/**
 * RF34: parámetros configurables por el SUPERADMIN. Los porcentajes y
 * plazos se aplican a las solicitudes nuevas; los montos ya calculados
 * quedan congelados en `pago` (CP35).
 *
 * Se mantiene `snake_case` para que la API exponga exactamente los mismos
 * nombres que el resto de DTOs y respuestas del proyecto.
 */
export interface ConfiguracionPlataforma {
  /** RN01: comisión de la plataforma sobre el total acordado. */
  comision_pct: number;
  /** RN01: porcentaje que se cobra por QR al confirmar la oferta. */
  pago_inicial_pct: number;
  /** RN02: multiplicador aplicado a las solicitudes urgentes. */
  factor_urgente: number;
  /** CP36: minutos de vigencia del QR antes de poder regenerarlo. */
  minutos_vigencia_qr: number;
  /** RN03: horas de anticipación para cancelar sin penalidad. */
  horas_cancelacion_sin_penalidad: number;
  /** RN04: días hábiles máximos para completar una devolución. */
  dias_habiles_devolucion: number;
  /** RN08 / RF25: horas para el cierre automático con una confirmación. */
  horas_cierre_automatico: number;
  /** RN06 / RF15: días de vigencia de una solicitud sin trabajador. */
  dias_caducidad_solicitud: number;
  /** RN06 / RF15: días que una urgente puede permanecer en el tope. */
  dias_tope_urgente: number;
  /** RN09: días de pausa máxima antes de la baja automática. */
  dias_pausa_maxima: number;
  /** RN09: días desde la pausa para dar de baja el rol de trabajador. */
  dias_pausa_baja: number;
  /** RF10: días de anticipación del aviso de vencimiento del REJAP. */
  dias_aviso_antecedentes: number;
  /** RN07: días desde el cierre para abrir un reclamo. */
  dias_reclamo: number;
  /** RF30: horas que tiene el trabajador para responder un reclamo. */
  horas_respuesta_reclamo: number;
  /** RF30: horas de SLA para que el supervisor resuelva un reclamo. */
  horas_sla_supervisor: number;
}
