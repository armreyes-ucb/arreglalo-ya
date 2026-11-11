import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type {
  PerfilTrabajadorPropio,
  TrabajadorMatch,
  TrabajadorPublico,
} from './models';

export interface ActualizarPerfilPayload {
  especialidades?: string[];
  horarios?: string;
  precios_estimados?: Record<string, number>;
  zonas_ids?: number[];
  fotos_urls?: string[];
}

@Injectable({ providedIn: 'root' })
export class TrabajadoresService {
  private readonly http = inject(HttpClient);

  perfilPropio(): Promise<PerfilTrabajadorPropio> {
    return firstValueFrom(
      this.http.get<PerfilTrabajadorPropio>(
        `${API_URL}/trabajadores/perfil`,
      ),
    );
  }

  actualizarPerfil(
    payload: ActualizarPerfilPayload,
  ): Promise<PerfilTrabajadorPropio> {
    return firstValueFrom(
      this.http.patch<PerfilTrabajadorPropio>(
        `${API_URL}/trabajadores/perfil`,
        payload,
      ),
    );
  }

  buscar(
    zonaId: number,
    especialidad?: string | null,
  ): Promise<TrabajadorMatch[]> {
    let params = new HttpParams().set('zona_id', String(zonaId));
    if (especialidad) {
      params = params.set('especialidad', especialidad);
    }
    return firstValueFrom(
      this.http.get<TrabajadorMatch[]>(
        `${API_URL}/trabajadores/buscar`,
        { params },
      ),
    );
  }

  perfilPublico(id: string): Promise<TrabajadorPublico> {
    return firstValueFrom(
      this.http.get<TrabajadorPublico>(
        `${API_URL}/trabajadores/${id}`,
      ),
    );
  }
}
