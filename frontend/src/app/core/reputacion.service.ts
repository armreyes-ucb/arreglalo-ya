import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type {
  CalificacionPublica,
  ReclamoPublico,
  ResumenReputacion,
  ResolucionReclamo,
  SuspensionRegistrada,
} from './models';

export interface CrearCalificacionPayload {
  estrellas: number;
  calidad?: number;
  puntualidad?: number;
  trato?: number;
  precio_justo?: number;
  comentario?: string;
}

export interface ComentarSolicitudPayload {
  comentario: string;
  estrellas?: number;
  calidad?: number;
  puntualidad?: number;
  trato?: number;
  precio_justo?: number;
}

export interface CrearReclamoPayload {
  motivo: string;
  evidencia_fotos?: string[];
}

export interface ResponderCalificacionPayload {
  respuesta: string;
}

export interface ResponderReclamoPayload {
  respuesta: string;
}

export interface ResolverReclamoPayload {
  decision: 'FALTA_TRABAJADOR' | 'RECHAZADO';
  resolucion: string;
}

@Injectable({ providedIn: 'root' })
export class ReputacionService {
  private readonly http = inject(HttpClient);

  calificar(
    solicitudId: string,
    payload: CrearCalificacionPayload,
  ): Promise<CalificacionPublica> {
    return firstValueFrom(
      this.http.post<CalificacionPublica>(
        `${API_URL}/solicitudes/${solicitudId}/calificar`,
        payload,
      ),
    );
  }

  comentar(
    solicitudId: string,
    payload: ComentarSolicitudPayload,
  ): Promise<CalificacionPublica> {
    return firstValueFrom(
      this.http.post<CalificacionPublica>(
        `${API_URL}/solicitudes/${solicitudId}/comentarios`,
        payload,
      ),
    );
  }

  reclamar(
    solicitudId: string,
    payload: CrearReclamoPayload,
  ): Promise<ReclamoPublico> {
    return firstValueFrom(
      this.http.post<ReclamoPublico>(
        `${API_URL}/solicitudes/${solicitudId}/reclamos`,
        payload,
      ),
    );
  }

  responderCalificacion(
    calificacionId: string,
    payload: ResponderCalificacionPayload,
  ): Promise<CalificacionPublica> {
    return firstValueFrom(
      this.http.patch<CalificacionPublica>(
        `${API_URL}/calificaciones/${calificacionId}/responder`,
        payload,
      ),
    );
  }

  responderReclamo(
    reclamoId: string,
    payload: ResponderReclamoPayload,
  ): Promise<ReclamoPublico> {
    return firstValueFrom(
      this.http.patch<ReclamoPublico>(
        `${API_URL}/reclamos/${reclamoId}/responder`,
        payload,
      ),
    );
  }

  resolverReclamo(
    reclamoId: string,
    payload: ResolverReclamoPayload,
  ): Promise<ResolucionReclamo> {
    return firstValueFrom(
      this.http.patch<ResolucionReclamo>(
        `${API_URL}/reclamos/${reclamoId}/resolver`,
        payload,
      ),
    );
  }

  misCalificaciones(): Promise<CalificacionPublica[]> {
    return firstValueFrom(
      this.http.get<CalificacionPublica[]>(`${API_URL}/calificaciones/mias`),
    );
  }

  calificacionesRecibidas(): Promise<CalificacionPublica[]> {
    return firstValueFrom(
      this.http.get<CalificacionPublica[]>(
        `${API_URL}/calificaciones/recibidas`,
      ),
    );
  }

  reclamosMios(): Promise<ReclamoPublico[]> {
    return firstValueFrom(
      this.http.get<ReclamoPublico[]>(`${API_URL}/reclamos/mios`),
    );
  }

  reclamosAsignados(): Promise<ReclamoPublico[]> {
    return firstValueFrom(
      this.http.get<ReclamoPublico[]>(`${API_URL}/reclamos/asignados`),
    );
  }

  bandejaReclamos(): Promise<ReclamoPublico[]> {
    return firstValueFrom(
      this.http.get<ReclamoPublico[]>(`${API_URL}/reclamos/bandeja`),
    );
  }

  reputacionTrabajador(
    trabajadorId: string,
  ): Promise<ResumenReputacion> {
    return firstValueFrom(
      this.http.get<ResumenReputacion>(
        `${API_URL}/calificaciones/trabajador/${trabajadorId}`,
      ),
    );
  }

  misSuspensiones(): Promise<SuspensionRegistrada[]> {
    return firstValueFrom(
      this.http.get<SuspensionRegistrada[]>(
        `${API_URL}/suspensiones/mias`,
      ),
    );
  }
}