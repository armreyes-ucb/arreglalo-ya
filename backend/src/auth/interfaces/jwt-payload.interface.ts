import type { Rol } from '../../common/enums/rol.enum.js';

export interface JwtPayload {
  sub: string;
  telefono: string;
  roles: Rol[];
  rolActivo: Rol;
  iat?: number;
  exp?: number;
}
