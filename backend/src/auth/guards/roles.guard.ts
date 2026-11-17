import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import { Rol } from '../../common/enums/rol.enum.js';
import type { RequestWithUser } from '../../common/interfaces/request-with-user.interface.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const usuario = request.user;
    if (!usuario) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción',
      );
    }

    /**
     * Jerarquía administrativa (RF07/RF34): el SUPERADMIN puede usar los
     * endpoints de supervisión y administración, incluso si su rol activo
     * es otro. No hereda los roles de CLIENTE ni TRABAJADOR porque esos
     * flujos dependen de filas propias (por ejemplo `perfil_trabajador`).
     */
    const esSuperadmin =
      usuario.rolActivo === Rol.SUPERADMIN ||
      (usuario.roles?.includes(Rol.SUPERADMIN) ?? false);
    if (esSuperadmin) {
      if (
        roles.includes(Rol.SUPERADMIN) ||
        roles.includes(Rol.SUPERVISOR)
      ) {
        return true;
      }
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción',
      );
    }

    if (!roles.includes(usuario.rolActivo)) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción',
      );
    }
    return true;
  }
}
