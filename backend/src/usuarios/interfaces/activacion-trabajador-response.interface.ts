import type { AuthTokenResponse } from '../../auth/interfaces/auth-token-response.interface.js';
import type { ZonaPublica } from '../../common/interfaces/zona-publica.interface.js';
import type { PerfilTrabajadorPublico } from './perfil-trabajador-publico.interface.js';

export interface ActivacionTrabajadorResponse extends AuthTokenResponse {
  perfil: PerfilTrabajadorPublico;
  zonas: ZonaPublica[];
}
