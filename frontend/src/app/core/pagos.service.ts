import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type { Pago, ResolucionPagoFinal } from './models';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly http = inject(HttpClient);

  confirmarPago(pagoId: string): Promise<Pago> {
    return firstValueFrom(
      this.http.post<Pago>(
        `${API_URL}/pagos/${pagoId}/webhook-confirmar`,
        {},
      ),
    );
  }

  marcarYaPague(pagoId: string): Promise<ResolucionPagoFinal> {
    return firstValueFrom(
      this.http.patch<ResolucionPagoFinal>(
        `${API_URL}/pagos/${pagoId}/ya-pague`,
        {},
      ),
    );
  }

  confirmarPago75(
    pagoId: string,
    confirmado: boolean,
    motivo?: string,
  ): Promise<ResolucionPagoFinal> {
    return firstValueFrom(
      this.http.patch<ResolucionPagoFinal>(
        `${API_URL}/pagos/${pagoId}/confirmar-75`,
        { confirmado, motivo },
      ),
    );
  }
}
