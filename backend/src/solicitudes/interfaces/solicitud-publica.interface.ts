import type { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';
import type { EstadoSolicitud } from '../../common/enums/estado-solicitud.enum.js';
import type { ZonaPublica } from '../../common/interfaces/zona-publica.interface.js';

export interface SolicitudPublica {
  id: string;
  cliente_id: string;
  trabajador_confirmado_id: string | null;
  zona_id: number;
  zona: ZonaPublica | null;
  especialidad: EspecialidadTipo;
  tipo_problema: string;
  descripcion: string;
  fotos_urls: string[];
  direccion_oculta: string;
  fecha_cita_preferida: Date;
  urgente: boolean;
  estado: EstadoSolicitud;
  creada_en: Date;
  vence_en: Date;
  entro_al_tope: Date | null;
  cerrada_en: Date | null;
}
