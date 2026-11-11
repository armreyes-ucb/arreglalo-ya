import { Injectable, signal } from '@angular/core';

export type TipoToast = 'exito' | 'error' | 'info';

export interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private contador = 0;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  exito(mensaje: string): void {
    this.agregar('exito', mensaje);
  }

  error(mensaje: string): void {
    this.agregar('error', mensaje);
  }

  info(mensaje: string): void {
    this.agregar('info', mensaje);
  }

  cerrar(id: number): void {
    this._toasts.update((toasts) =>
      toasts.filter((toast) => toast.id !== id),
    );
  }

  private agregar(tipo: TipoToast, mensaje: string): void {
    const id = ++this.contador;
    this._toasts.update((toasts) => [
      ...toasts,
      { id, tipo, mensaje },
    ]);
    setTimeout(() => this.cerrar(id), 4500);
  }
}
