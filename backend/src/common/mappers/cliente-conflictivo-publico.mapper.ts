import type { ClienteConflictivo } from '../../entities/cliente-conflictivo.entity.js';
import type { ClienteConflictivoPublico } from '../../reputacion/interfaces/cliente-conflictivo-publico.interface.js';
import { REPORTES_PARA_ADVERTIR } from '../../reputacion/reputacion.constants.js';

export function toClienteConflictivoPublico(
  conflictivo: ClienteConflictivo,
): ClienteConflictivoPublico {
  return {
    id: conflictivo.id,
    cliente_id: conflictivo.clienteId,
    reportes_acumulados: conflictivo.reportesAcumulados,
    motivo: conflictivo.motivo,
    fecha_registro: conflictivo.fechaRegistro,
    advertir:
      conflictivo.reportesAcumulados >= REPORTES_PARA_ADVERTIR,
  };
}
