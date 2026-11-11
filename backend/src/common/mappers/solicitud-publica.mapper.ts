import type { Zona } from '../../entities/zona.entity.js';
import type { Solicitud } from '../../entities/solicitud.entity.js';
import type { SolicitudPublica } from '../../solicitudes/interfaces/solicitud-publica.interface.js';
import { toPublicZona } from './zona-publica.mapper.js';

export function toSolicitudPublica(
  solicitud: Solicitud,
  zona?: Zona | null,
): SolicitudPublica {
  return {
    id: solicitud.id,
    cliente_id: solicitud.clienteId,
    trabajador_confirmado_id: solicitud.trabajadorConfirmadoId,
    zona_id: solicitud.zonaId,
    zona: zona ? toPublicZona(zona) : null,
    especialidad: solicitud.especialidad,
    tipo_problema: solicitud.tipoProblema,
    descripcion: solicitud.descripcion,
    fotos_urls: solicitud.fotosUrls,
    direccion_oculta: solicitud.direccionOculta,
    fecha_cita_preferida: solicitud.fechaCitaPreferida,
    urgente: solicitud.urgente,
    estado: solicitud.estado,
    creada_en: solicitud.creadaEn,
    vence_en: solicitud.venceEn,
    entro_al_tope: solicitud.entroAlTope,
    cerrada_en: solicitud.cerradaEn,
  };
}
