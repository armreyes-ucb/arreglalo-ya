import type { Reclamo } from '../../entities/reclamo.entity.js';
import type { ReclamoPublico } from '../../reputacion/interfaces/reclamo-publico.interface.js';
import {
  ESTADOS_RECLAMO_ABIERTO,
  HORAS_RESPUESTA_RECLAMO,
  HORAS_REVISION_SUPERVISOR,
  MS_POR_HORA,
} from '../../reputacion/reputacion.constants.js';

export interface ParametrosReclamoPublico {
  horasRespuesta?: number;
  horasSla?: number;
}

export function toReclamoPublico(
  reclamo: Reclamo,
  ahora: Date = new Date(),
  parametros: ParametrosReclamoPublico = {},
): ReclamoPublico {
  const horasRespuesta =
    parametros.horasRespuesta ?? HORAS_RESPUESTA_RECLAMO;
  const horasSla =
    parametros.horasSla ?? HORAS_REVISION_SUPERVISOR;
  const abierto = ESTADOS_RECLAMO_ABIERTO.includes(reclamo.estado);
  const horasTranscurridas =
    (ahora.getTime() - reclamo.fechaApertura.getTime()) /
    MS_POR_HORA;
  const horasRestantes = abierto
    ? Math.max(0, horasRespuesta - horasTranscurridas)
    : 0;

  return {
    id: reclamo.id,
    solicitud_id: reclamo.solicitudId,
    motivo: reclamo.motivo,
    evidencia_fotos: reclamo.evidenciaFotos,
    respuesta_trabajador: reclamo.respuestaTrabajador,
    estado: reclamo.estado,
    resolucion_supervisor: reclamo.resolucionSupervisor,
    fecha_apertura: reclamo.fechaApertura,
    horas_para_responder: abierto
      ? Math.round(horasRestantes * 10) / 10
      : null,
    fuera_de_plazo:
      abierto && horasTranscurridas > horasRespuesta,
    vencido_sla:
      abierto && horasTranscurridas > horasSla,
  };
}
