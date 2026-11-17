import {
  ForbiddenException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { Rol } from '../../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { RolesGuard } from './roles.guard.js';

function crearContexto(usuario: AuthenticatedUser | undefined): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ user: usuario }),
    }),
  } as unknown as ExecutionContext;
}

function crearGuard(roles: Rol[] | undefined): RolesGuard {
  const reflector = {
    getAllAndOverride: vi.fn(() => roles),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

function usuario(rolActivo: Rol): AuthenticatedUser {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    telefono: '+59170000000',
    roles: [rolActivo],
    rolActivo,
  };
}

describe('RolesGuard - jerarquía administrativa', () => {
  it('CP16: un SUPERVISOR no puede acceder a un endpoint de SUPERADMIN', () => {
    const guard = crearGuard([Rol.SUPERADMIN]);
    expect(() =>
      guard.canActivate(crearContexto(usuario(Rol.SUPERVISOR))),
    ).toThrow(ForbiddenException);
  });

  it('un SUPERVISOR accede a sus propios endpoints', () => {
    const guard = crearGuard([Rol.SUPERVISOR]);
    expect(
      guard.canActivate(crearContexto(usuario(Rol.SUPERVISOR))),
    ).toBe(true);
  });

  it('el SUPERADMIN hereda los endpoints de SUPERVISOR', () => {
    const guard = crearGuard([Rol.SUPERVISOR]);
    expect(
      guard.canActivate(crearContexto(usuario(Rol.SUPERADMIN))),
    ).toBe(true);
  });

  it('el SUPERADMIN no salta los endpoints de TRABAJADOR ni CLIENTE', () => {
    const guardTrabajador = crearGuard([Rol.TRABAJADOR]);
    expect(() =>
      guardTrabajador.canActivate(
        crearContexto(usuario(Rol.SUPERADMIN)),
      ),
    ).toThrow(ForbiddenException);

    const guardCliente = crearGuard([Rol.CLIENTE]);
    expect(() =>
      guardCliente.canActivate(
        crearContexto(usuario(Rol.SUPERADMIN)),
      ),
    ).toThrow(ForbiddenException);
  });
});
