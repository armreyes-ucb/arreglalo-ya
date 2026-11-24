import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type { SuspensionRegistrada, ClienteConflictivoPublico, DevolucionPublica } from './models';

export interface AplicarSuspensionPayload {
  trabajador_id: string;
  motivo: string;
}

export interface RegistrarConflictivoPayload {
  cliente_id: string;
  motivo: string;
}

@Injectable({ providedIn: 'root' })
export class SupervisionService {
  private readonly http = inject(HttpClient);

  listarSuspensiones(trabajadorId?: string): Promise<SuspensionRegistrada[]> {
    let params = new HttpParams();
    if (trabajadorId) {
      params = params.set('trabajador_id', trabajadorId);
    }
    return firstValueFrom(
      this.http.get<SuspensionRegistrada[]>(`${API_URL}/supervision/suspensiones`, { params }),
    );
  }

  aplicarSuspension(payload: AplicarSuspensionPayload): Promise<SuspensionRegistrada> {
    return firstValueFrom(
      this.http.post<SuspensionRegistrada>(`${API_URL}/supervision/suspensiones`, payload),
    );
  }

  listarConflictivos(): Promise<ClienteConflictivoPublico[]> {
    return firstValueFrom(
      this.http.get<ClienteConflictivoPublico[]>(`${API_URL}/supervision/clientes-conflictivos`),
    );
  }

  obtenerConflictivo(clienteId: string): Promise<ClienteConflictivoPublico> {
    return firstValueFrom(
      this.http.get<ClienteConflictivoPublico>(
        `${API_URL}/supervision/clientes-conflictivos/${clienteId}`,
      ),
    );
  }

  registrarConflictivo(payload: RegistrarConflictivoPayload): Promise<ClienteConflictivoPublico> {
    return firstValueFrom(
      this.http.post<ClienteConflictivoPublico>(
        `${API_URL}/supervision/clientes-conflictivos`,
        payload,
      ),
    );
  }

  listarDevoluciones(): Promise<DevolucionPublica[]> {
    return firstValueFrom(
      this.http.get<DevolucionPublica[]>(`${API_URL}/supervision/devoluciones`),
    );
  }
}
