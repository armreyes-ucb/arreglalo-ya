import type { SuspensionPublica } from '../../common/interfaces/suspension-publica.interface.js';

export interface SuspensionRegistrada extends SuspensionPublica {
  activa: boolean;
}
