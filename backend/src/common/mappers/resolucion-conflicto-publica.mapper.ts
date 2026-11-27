import type { ClienteConflictivoResolucion } from '../../entities/cliente-conflictivo-resolucion.entity.js';
import type { ResolucionConflictoPublica } from '../../reputacion/interfaces/resolucion-conflicto.interface.js';

export function toResolucionConflictoPublica(
  resolucion: ClienteConflictivoResolucion,
): ResolucionConflictoPublica {
  return {
    id: resolucion.id,
    conflictivo_id: resolucion.conflictivoId,
    cliente_id: resolucion.clienteId,
    supervisor_id: resolucion.supervisorId,
    decision: resolucion.decision,
    justificacion: resolucion.justificacion,
    indicadores: resolucion.indicadores,
    fecha: resolucion.fecha,
  };
}
