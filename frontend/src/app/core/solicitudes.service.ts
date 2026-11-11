import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type {
  NuevaOferta,
  Oferta,
  OfertaConSolicitud,
  Solicitud,
  SolicitudDetalle,
  SolicitudDisponible,
} from './models';

export interface CrearSolicitudPayload {
  zona_id: number;
  especialidad: string;
  tipo_problema: string;
  descripcion: string;
  fotos_urls: string[];
  direccion_oculta: string;
  fecha_cita_preferida: string;
  urgente: boolean;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly http = inject(HttpClient);

  crear(payload: CrearSolicitudPayload): Promise<Solicitud> {
    return firstValueFrom(
      this.http.post<Solicitud>(`${API_URL}/solicitudes`, payload),
    );
  }

  mias(): Promise<Solicitud[]> {
    return firstValueFrom(
      this.http.get<Solicitud[]>(`${API_URL}/solicitudes/mias`),
    );
  }

  detalle(id: string): Promise<SolicitudDetalle> {
    return firstValueFrom(
      this.http.get<SolicitudDetalle>(
        `${API_URL}/solicitudes/${id}`,
      ),
    );
  }

  disponibles(filtros: {
    zona_id?: number | null;
    especialidad?: string | null;
  }): Promise<SolicitudDisponible[]> {
    let params = new HttpParams();
    if (filtros.zona_id) {
      params = params.set('zona_id', String(filtros.zona_id));
    }
    if (filtros.especialidad) {
      params = params.set('especialidad', filtros.especialidad);
    }
    return firstValueFrom(
      this.http.get<SolicitudDisponible[]>(
        `${API_URL}/solicitudes/disponibles`,
        { params },
      ),
    );
  }

  ofertar(
    solicitudId: string,
    oferta: NuevaOferta,
  ): Promise<Oferta> {
    return firstValueFrom(
      this.http.post<Oferta>(
        `${API_URL}/solicitudes/${solicitudId}/ofertas`,
        oferta,
      ),
    );
  }

  misOfertas(): Promise<OfertaConSolicitud[]> {
    return firstValueFrom(
      this.http.get<OfertaConSolicitud[]>(
        `${API_URL}/solicitudes/mis-ofertas`,
      ),
    );
  }
}
