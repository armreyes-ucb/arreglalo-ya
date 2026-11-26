import type { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';
import type { EstadoAlerta } from '../../common/enums/estado-alerta.enum.js';
import type { EstadoSolicitud } from '../../common/enums/estado-solicitud.enum.js';
import type { ZonaPublica } from '../../common/interfaces/zona-publica.interface.js';

/** Alerta activa de una solicitud que no recibió ofertas a tiempo. */
export interface AlertaSinOfertas {
  id: string;
  solicitud_id: string;
  estado: EstadoAlerta;
  minutos_configurados: number;
  creada_en: Date;
  vence_en_original: Date;
  vence_en_actual: Date;
  estado_solicitud: EstadoSolicitud;
  especialidad: EspecialidadTipo;
  tipo_problema: string;
  descripcion: string;
  zona: ZonaPublica | null;
  cliente_id: string;
  minutos_en_espera: number;
}

export interface ListadoAlertasSinOfertas {
  minutos_sin_ofertas: number;
  total: number;
  alertas: AlertaSinOfertas[];
}
