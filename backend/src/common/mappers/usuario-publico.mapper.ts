import type { Usuario } from '../../entities/usuario.entity.js';
import type { UsuarioPublico } from '../interfaces/usuario-publico.interface.js';

export function toPublicUser(usuario: Usuario): UsuarioPublico {
  return {
    id: usuario.id,
    nombre_completo: usuario.nombreCompleto,
    telefono: usuario.telefono,
    roles: usuario.roles,
    estado: usuario.estado,
    fecha_registro: usuario.fechaRegistro,
  };
}
