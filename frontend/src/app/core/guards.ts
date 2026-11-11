import { inject } from '@angular/core';
import {
  type CanActivateFn,
  Router,
} from '@angular/router';
import { AuthService } from './auth.service';
import { panelDeRol } from './catalogos';
import type { Rol } from './models';

export const authGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.autenticado()) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { volver: estado.url },
  });
};

export const publicOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const rol = auth.rolActivo();
  if (!rol) {
    return true;
  }
  return router.createUrlTree([panelDeRol(rol)]);
};

export function roleGuard(...roles: Rol[]): CanActivateFn {
  return (_ruta, estado) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.autenticado()) {
      return router.createUrlTree(['/login'], {
        queryParams: { volver: estado.url },
      });
    }
    const activo = auth.rolActivo();
    if (activo && roles.includes(activo)) {
      return true;
    }
    const asignado = roles.find((rol) =>
      auth.roles().includes(rol),
    );
    if (asignado) {
      return router.createUrlTree([panelDeRol(asignado)], {
        queryParams: { aviso: 'rol' },
      });
    }
    return router.createUrlTree(['/sin-acceso']);
  };
}
