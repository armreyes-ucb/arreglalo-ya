import type { HistorialEstado } from '../../entities/historial-estado.entity.js';
import type { Oferta } from '../../entities/oferta.entity.js';
import type { Solicitud } from '../../entities/solicitud.entity.js';
import type { Zona } from '../../entities/zona.entity.js';
import type {
  EventoHistorial,
  SolicitudDetalle,
} from '../../solicitudes/interfaces/solicitud-detalle.interface.js';
import type { OfertaConSolicitud } from '../../solicitudes/interfaces/oferta-con-solicitud.interface.js';
import { toOfertaPublica } from './oferta-publica.mapper.js';
import { toSolicitudPublica } from './solicitud-publica.mapper.js';
import { toPublicZona } from './zona-publica.mapper.js';

export function toEventoHistorial(
  historial: HistorialEstado,
): EventoHistorial {
  return {
    estado: historial.estado,
    fecha_hora: historial.fechaHora,
    usuario_id: historial.usuarioId,
    usuario_nombre: historial.usuario?.nombreCompleto ?? null,
  };
}

export function toSolicitudDetalle(
  solicitud: Solicitud,
  zona: Zona | null,
  historial: HistorialEstado[],
  totalOfertas: number,
): SolicitudDetalle {
  return {
    ...toSolicitudPublica(solicitud, zona),
    total_ofertas: totalOfertas,
    historial: historial.map(toEventoHistorial),
  };
}

export function toOfertaConSolicitud(
  oferta: Oferta,
  solicitud: Solicitud,
  zona: Zona | null,
): OfertaConSolicitud {
  return {
    ...toOfertaPublica(oferta),
    solicitud: {
      id: solicitud.id,
      zona_id: solicitud.zonaId,
      zona: zona ? toPublicZona(zona) : null,
      especialidad: solicitud.especialidad,
      tipo_problema: solicitud.tipoProblema,
      estado: solicitud.estado,
      urgente: solicitud.urgente,
      fecha_cita_preferida: solicitud.fechaCitaPreferida,
    },
  };
}
