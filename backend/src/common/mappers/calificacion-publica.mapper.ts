import type { Calificacion } from '../../entities/calificacion.entity.js';
import type { CalificacionPublica } from '../../reputacion/interfaces/calificacion-publica.interface.js';

export function toCalificacionPublica(
  calificacion: Calificacion,
): CalificacionPublica {
  return {
    id: calificacion.id,
    solicitud_id: calificacion.solicitudId,
    autor_id: calificacion.autorId,
    destinatario_id: calificacion.destinatarioId,
    estrellas: calificacion.estrellas,
    calidad: calificacion.calidad,
    puntualidad: calificacion.puntualidad,
    trato: calificacion.trato,
    precio_justo: calificacion.precioJusto,
    comentario: calificacion.comentario,
    respuesta_trabajador: calificacion.respuestaTrabajador,
    fecha: calificacion.fecha,
  };
}
