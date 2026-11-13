import type { EstadoSolicitud } from '../../common/enums/estado-solicitud.enum.js';
import type { SolicitudPublica } from './solicitud-publica.interface.js';

export interface EventoHistorial {
  estado: EstadoSolicitud;
  fecha_hora: Date;
  usuario_id: string;
  usuario_nombre: string | null;
}

export type SolicitudDetalle = Omit<
  SolicitudPublica,
  'direccion_oculta'
> & {
  direccion_oculta: string | null;
  whatsapp_url: string | null;
  total_ofertas: number;
  historial: EventoHistorial[];
};
