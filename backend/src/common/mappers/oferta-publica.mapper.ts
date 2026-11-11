import type { Oferta } from '../../entities/oferta.entity.js';
import type { OfertaPublica } from '../../solicitudes/interfaces/oferta-publica.interface.js';

export function toOfertaPublica(oferta: Oferta): OfertaPublica {
  return {
    id: oferta.id,
    solicitud_id: oferta.solicitudId,
    trabajador_id: oferta.trabajadorId,
    precio_estimado: oferta.precioEstimado,
    costo_transporte: oferta.costoTransporte,
    fecha_propuesta: oferta.fechaPropuesta,
    mensaje: oferta.mensaje,
    estado: oferta.estado,
    creada_en: oferta.creadaEn,
  };
}
