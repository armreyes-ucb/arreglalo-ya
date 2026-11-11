import {
  HttpErrorResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const esApi = req.url.startsWith(API_URL);

  const peticion =
    token && esApi
      ? req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        esApi &&
        !req.url.includes('/auth/')
      ) {
        auth.cerrarSesion(false);
        void router.navigate(['/login'], {
          queryParams: { motivo: 'sesion-expirada' },
        });
      }
      return throwError(() => error);
    }),
  );
};
