import { EstadoReclamo } from '../common/enums/estado-reclamo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';

/** RN07: el cliente tiene 7 días desde el cierre para reclamar. */
export const DIAS_MAXIMOS_RECLAMO = 7;

/** RF30: el trabajador responde el reclamo en 48 horas. */
export const HORAS_RESPUESTA_RECLAMO = 48;

/** RF32: desde 3 reportes el cliente se considera conflictivo. */
export const REPORTES_PARA_ADVERTIR = 3;

/** RN12: una calificación por día, por trabajo y por autor. */
export const CALIFICACIONES_POR_DIA = 1;

/** Estados en los que el trabajo ya permite calificar. */
export const ESTADOS_CALIFICABLES: EstadoSolicitud[] = [
  EstadoSolicitud.CONFIRMADA,
  EstadoSolicitud.EN_PROGRESO,
  EstadoSolicitud.TERMINADA_TRABAJADOR,
  EstadoSolicitud.FINALIZADA,
];

/** Estados de un reclamo que todavía admite respuesta o revisión. */
export const ESTADOS_RECLAMO_ABIERTO: EstadoReclamo[] = [
  EstadoReclamo.ABIERTO,
  EstadoReclamo.RESPONDIDO,
  EstadoReclamo.EN_REVISION_SUPERVISOR,
];

export const MS_POR_HORA = 3_600_000;
