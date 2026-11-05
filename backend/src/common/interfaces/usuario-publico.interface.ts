import type { EstadoUsuario } from '../enums/estado-usuario.enum.js';
import type { Rol } from '../enums/rol.enum.js';

export interface UsuarioPublico {
  id: string;
  nombre_completo: string;
  telefono: string;
  roles: Rol[];
  estado: EstadoUsuario;
  fecha_registro: Date;
}
