import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toasts',
  template: `
    <div class="toasts" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast--' + toast.tipo">
          <span>{{ toast.mensaje }}</span>
          <button
            type="button"
            class="toast__cerrar"
            aria-label="Cerrar aviso"
            (click)="toastService.cerrar(toast.id)"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly toastService = inject(ToastService);
}
