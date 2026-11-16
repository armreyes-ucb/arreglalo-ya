export interface CalificacionPublica {
  id: string;
  solicitud_id: string;
  autor_id: string;
  destinatario_id: string;
  estrellas: number;
  calidad: number | null;
  puntualidad: number | null;
  trato: number | null;
  precio_justo: number | null;
  comentario: string | null;
  respuesta_trabajador: string | null;
  fecha: string;
}
