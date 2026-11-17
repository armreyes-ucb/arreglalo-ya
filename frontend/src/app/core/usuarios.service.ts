import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type { EliminacionCuentaResponse } from './models';

export interface EliminarCuentaPayload {
  password: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  eliminarCuenta(payload: EliminarCuentaPayload): Promise<EliminacionCuentaResponse> {
    return firstValueFrom(
      this.http.delete<EliminacionCuentaResponse>(
        `${API_URL}/usuarios/mi-cuenta`,
        { body: payload },
      ),
    );
  }
}