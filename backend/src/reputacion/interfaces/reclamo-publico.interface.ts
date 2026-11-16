import type { EstadoReclamo } from '../../common/enums/estado-reclamo.enum.js';

export interface ReclamoPublico {
  id: string;
  solicitud_id: string;
  motivo: string;
  evidencia_fotos: string[];
  respuesta_trabajador: string | null;
  estado: EstadoReclamo;
  resolucion_supervisor: string | null;
  fecha_apertura: Date;
  horas_para_responder: number | null;
  fuera_de_plazo: boolean;
}
