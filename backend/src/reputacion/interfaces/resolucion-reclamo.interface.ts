import type { ReclamoPublico } from './reclamo-publico.interface.js';
import type { SuspensionRegistrada } from './suspension-registrada.interface.js';

export interface ResolucionReclamo {
  reclamo: ReclamoPublico;
  suspension: SuspensionRegistrada | null;
}
