import type { EstadoOferta } from '../../common/enums/estado-oferta.enum.js';

export interface OfertaPublica {
  id: string;
  solicitud_id: string;
  trabajador_id: string;
  precio_estimado: number;
  costo_transporte: number;
  fecha_propuesta: Date;
  mensaje: string | null;
  estado: EstadoOferta;
  creada_en: Date;
}
