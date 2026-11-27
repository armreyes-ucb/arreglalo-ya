import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type {
  SuspensionRegistrada,
  ClienteConflictivoPublico,
  DevolucionPublica,
  DetalleConflictoPublico,
  ResolucionConflictoPublica,
  ResumenDeteccion,
  EstadoClienteConflictivo,
  DecisionConflicto,
} from './models';

export interface AplicarSuspensionPayload {
  trabajador_id: string;
  motivo: string;
}

export interface RegistrarConflictivoPayload {
  cliente_id: string;
  motivo: string;
}

export interface ResolverConflictoPayload {
  decision: DecisionConflicto;
  justificacion: string;
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

  listarConflictivos(estado?: EstadoClienteConflictivo): Promise<ClienteConflictivoPublico[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return firstValueFrom(
      this.http.get<ClienteConflictivoPublico[]>(
        `${API_URL}/supervision/clientes-conflictivos`,
        { params },
      ),
    );
  }

  detectarConflictivos(): Promise<ResumenDeteccion> {
    return firstValueFrom(
      this.http.post<ResumenDeteccion>(
        `${API_URL}/supervision/clientes-conflictivos/detectar`,
        {},
      ),
    );
  }

  obtenerConflictivo(clienteId: string): Promise<ClienteConflictivoPublico> {
    return firstValueFrom(
      this.http.get<ClienteConflictivoPublico>(
        `${API_URL}/supervision/clientes-conflictivos/${clienteId}`,
      ),
    );
  }

  obtenerDetalleConflictivo(clienteId: string): Promise<DetalleConflictoPublico> {
    return firstValueFrom(
      this.http.get<DetalleConflictoPublico>(
        `${API_URL}/supervision/clientes-conflictivos/${clienteId}/detalle`,
      ),
    );
  }

  listarResolucionesConflictivo(clienteId: string): Promise<ResolucionConflictoPublica[]> {
    return firstValueFrom(
      this.http.get<ResolucionConflictoPublica[]>(
        `${API_URL}/supervision/clientes-conflictivos/${clienteId}/resoluciones`,
      ),
    );
  }

  resolverConflictivo(
    clienteId: string,
    payload: ResolverConflictoPayload,
  ): Promise<ResolucionConflictoPublica> {
    return firstValueFrom(
      this.http.post<ResolucionConflictoPublica>(
        `${API_URL}/supervision/clientes-conflictivos/${clienteId}/resolver`,
        payload,
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
