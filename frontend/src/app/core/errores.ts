import { HttpErrorResponse } from '@angular/common/http';

export function mensajeDeError(
  error: unknown,
  porDefecto = 'No se pudo completar la operación. Intenta nuevamente.',
): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error as Record<string, unknown> | null;
    const mensaje = cuerpo?.['message'] ?? cuerpo?.['mensaje'];
    if (Array.isArray(mensaje)) {
      return mensaje.join(' ');
    }
    if (typeof mensaje === 'string' && mensaje.trim()) {
      return mensaje;
    }
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica que el backend esté encendido.';
    }
    if (error.status === 401) {
      return 'Tu sesión expiró. Vuelve a ingresar.';
    }
    if (error.status === 403) {
      return 'No tienes permisos para esta acción.';
    }
    return porDefecto;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return porDefecto;
}
