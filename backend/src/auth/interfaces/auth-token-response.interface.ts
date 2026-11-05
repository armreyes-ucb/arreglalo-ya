import type { Rol } from '../../common/enums/rol.enum.js';
import type { UsuarioPublico } from '../../common/interfaces/usuario-publico.interface.js';

export interface AuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: string;
  rol_activo: Rol;
  usuario: UsuarioPublico;
}
