import type { Suspension } from '../../entities/suspension.entity.js';
import type { SuspensionPublica } from '../interfaces/suspension-publica.interface.js';

export function toSuspensionPublica(
  suspension: Suspension,
): SuspensionPublica {
  return {
    id: suspension.id,
    trabajador_id: suspension.trabajadorId,
    numero_falta: suspension.numeroFalta,
    dias_fibonacci: suspension.diasFibonacci,
    motivo: suspension.motivo,
    inicio: suspension.inicio,
    fin: suspension.fin,
  };
}
