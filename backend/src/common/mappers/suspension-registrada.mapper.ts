import type { Suspension } from '../../entities/suspension.entity.js';
import type { SuspensionRegistrada } from '../../reputacion/interfaces/suspension-registrada.interface.js';
import { toSuspensionPublica } from './suspension-publica.mapper.js';

export function toSuspensionRegistrada(
  suspension: Suspension,
  ahora: Date = new Date(),
): SuspensionRegistrada {
  return {
    ...toSuspensionPublica(suspension),
    activa: suspension.fin.getTime() > ahora.getTime(),
  };
}
