import type { CalificacionPublica } from './calificacion-publica.interface.js';

export interface PromedioHabilidad {
  calidad: number | null;
  puntualidad: number | null;
  trato: number | null;
  precio_justo: number | null;
}

export interface ResumenReputacion {
  trabajador_id: string;
  promedio: number;
  total_trabajos: number;
  total_calificaciones: number;
  por_habilidad: PromedioHabilidad;
  calificaciones: CalificacionPublica[];
}
