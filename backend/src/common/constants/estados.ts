import { EstadoDevolucion } from '../enums/estado-devolucion.enum.js';
import { EstadoReclamo } from '../enums/estado-reclamo.enum.js';
import { EstadoSolicitud } from '../enums/estado-solicitud.enum.js';

/** Solicitudes que mantienen ocupado al trabajador (no puede pausar). */
export const ESTADOS_SOLICITUD_EN_CURSO: EstadoSolicitud[] = [
  EstadoSolicitud.CONFIRMADA,
  EstadoSolicitud.EN_PROGRESO,
  EstadoSolicitud.TERMINADA_TRABAJADOR,
];

/** Solicitudes que impiden el borrado de cuenta del cliente (CP22). */
export const ESTADOS_SOLICITUD_ACTIVA_CLIENTE: EstadoSolicitud[] = [
  EstadoSolicitud.PUBLICADA,
  EstadoSolicitud.CON_OFERTAS,
  EstadoSolicitud.PENDIENTE_PAGO,
  ...ESTADOS_SOLICITUD_EN_CURSO,
];

/** Devoluciones que siguen en curso y bloquean el borrado (CP22). */
export const ESTADOS_DEVOLUCION_ACTIVA: EstadoDevolucion[] = [
  EstadoDevolucion.PENDIENTE,
  EstadoDevolucion.EN_PROCESO,
];

/** Reclamos que todavía requieren gestión y bloquean el borrado (CP22). */
export const ESTADOS_RECLAMO_ABIERTO: EstadoReclamo[] = [
  EstadoReclamo.ABIERTO,
  EstadoReclamo.RESPONDIDO,
  EstadoReclamo.EN_REVISION_SUPERVISOR,
];
