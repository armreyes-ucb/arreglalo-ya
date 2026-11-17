import type { UsuarioPublico } from '../../common/interfaces/usuario-publico.interface.js';

/** RF07: respuesta de alta/edición de un supervisor. */
export interface SupervisorCreado {
  supervisor: UsuarioPublico;
  /** Solo se devuelve una vez, cuando el sistema generó la contraseña. */
  password_temporal: string | null;
  /** `false` cuando se promovió una cuenta existente. */
  creado: boolean;
}
