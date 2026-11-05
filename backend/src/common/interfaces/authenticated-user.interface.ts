import type { Rol } from '../enums/rol.enum.js';

export interface AuthenticatedUser {
  id: string;
  telefono: string;
  roles: Rol[];
  rolActivo: Rol;
}
