import type { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';
import type { EstadoSolicitud } from '../../common/enums/estado-solicitud.enum.js';
import type { ZonaPublica } from '../../common/interfaces/zona-publica.interface.js';
import type { OfertaPublica } from './oferta-publica.interface.js';

export interface ResumenSolicitudOferta {
  id: string;
  zona_id: number;
  zona: ZonaPublica | null;
  especialidad: EspecialidadTipo;
  tipo_problema: string;
  estado: EstadoSolicitud;
  urgente: boolean;
  fecha_cita_preferida: Date;
}

export interface OfertaConSolicitud extends OfertaPublica {
  solicitud: ResumenSolicitudOferta;
}
