import type { Solicitud } from '../../entities/solicitud.entity.js';
import type { Zona } from '../../entities/zona.entity.js';
import type { SolicitudDisponible } from '../../solicitudes/interfaces/solicitud-disponible.interface.js';
import { toPublicZona } from './zona-publica.mapper.js';

export function toSolicitudDisponible(
  solicitud: Solicitud,
  zona: Zona | null,
  clienteEnConflictivos: boolean,
): SolicitudDisponible {
  return {
    id: solicitud.id,
    zona_id: solicitud.zonaId,
    zona: zona ? toPublicZona(zona) : null,
    especialidad: solicitud.especialidad,
    tipo_problema: solicitud.tipoProblema,
    descripcion: solicitud.descripcion,
    fotos_urls: solicitud.fotosUrls,
    fecha_cita_preferida: solicitud.fechaCitaPreferida,
    urgente: solicitud.urgente,
    estado: solicitud.estado,
    creada_en: solicitud.creadaEn,
    vence_en: solicitud.venceEn,
    cliente_en_conflictivos: clienteEnConflictivos,
  };
}
