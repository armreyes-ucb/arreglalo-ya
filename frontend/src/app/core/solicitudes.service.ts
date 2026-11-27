import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type {
  NuevaOferta,
  Oferta,
  OfertaConSolicitud,
  OfertaConTrabajador,
  Pago,
  PagoSolicitud,
  Precio,
  ResolucionCancelacion,
  ResolucionPrecio,
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

export interface RegistrarPrecioFinalPayload {
  monto: number;
}

export interface RegistrarIncrementoPayload {
  monto: number;
  motivo: string;
  foto_evidencia_url: string;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private readonly http = inject(HttpClient);

  crear(payload: CrearSolicitudPayload): Promise<Solicitud> {
    return firstValueFrom(this.http.post<Solicitud>(`${API_URL}/solicitudes`, payload));
  }

  mias(): Promise<Solicitud[]> {
    return firstValueFrom(this.http.get<Solicitud[]>(`${API_URL}/solicitudes/mias`));
  }

  detalle(id: string): Promise<SolicitudDetalle> {
    return firstValueFrom(this.http.get<SolicitudDetalle>(`${API_URL}/solicitudes/${id}`));
  }

  ofertas(id: string): Promise<OfertaConTrabajador[]> {
    return firstValueFrom(
      this.http.get<OfertaConTrabajador[]>(`${API_URL}/solicitudes/${id}/ofertas`),
    );
  }

  pago(id: string): Promise<PagoSolicitud> {
    return firstValueFrom(this.http.get<PagoSolicitud>(`${API_URL}/solicitudes/${id}/pago`));
  }

  precios(id: string): Promise<Precio[]> {
    return firstValueFrom(this.http.get<Precio[]>(`${API_URL}/solicitudes/${id}/precios`));
  }

  disponibles(filtros: {
    zona_id?: number | null;
    especialidad?: string | null;
    incluir_fuera_de_zona?: boolean;
  }): Promise<SolicitudDisponible[]> {
    let params = new HttpParams();
    if (filtros.zona_id) {
      params = params.set('zona_id', String(filtros.zona_id));
    }
    if (filtros.especialidad) {
      params = params.set('especialidad', filtros.especialidad);
    }
    if (filtros.incluir_fuera_de_zona) {
      params = params.set('incluir_fuera_de_zona', 'true');
    }
    return firstValueFrom(
      this.http.get<SolicitudDisponible[]>(`${API_URL}/solicitudes/disponibles`, { params }),
    );
  }

  ofertar(solicitudId: string, oferta: NuevaOferta): Promise<Oferta> {
    return firstValueFrom(
      this.http.post<Oferta>(`${API_URL}/solicitudes/${solicitudId}/ofertas`, oferta),
    );
  }

  misOfertas(): Promise<OfertaConSolicitud[]> {
    return firstValueFrom(
      this.http.get<OfertaConSolicitud[]>(`${API_URL}/solicitudes/mis-ofertas`),
    );
  }

  elegirOferta(solicitudId: string, ofertaId: string): Promise<Pago> {
    return firstValueFrom(
      this.http.post<Pago>(`${API_URL}/solicitudes/${solicitudId}/elegir-oferta`, {
        oferta_id: ofertaId,
      }),
    );
  }

  registrarPrecioFinal(solicitudId: string, payload: RegistrarPrecioFinalPayload): Promise<Precio> {
    return firstValueFrom(
      this.http.post<Precio>(`${API_URL}/solicitudes/${solicitudId}/precio-final`, payload),
    );
  }

  responderPrecioFinal(solicitudId: string, aprobado: boolean): Promise<ResolucionPrecio> {
    return firstValueFrom(
      this.http.post<ResolucionPrecio>(
        `${API_URL}/solicitudes/${solicitudId}/precio-final/responder`,
        { aprobado },
      ),
    );
  }

  registrarIncremento(solicitudId: string, payload: RegistrarIncrementoPayload): Promise<Precio> {
    return firstValueFrom(
      this.http.post<Precio>(`${API_URL}/solicitudes/${solicitudId}/incremento`, payload),
    );
  }

  responderIncremento(
    solicitudId: string,
    precioId: string,
    aprobado: boolean,
  ): Promise<ResolucionPrecio> {
    return firstValueFrom(
      this.http.post<ResolucionPrecio>(
        `${API_URL}/solicitudes/${solicitudId}/incrementos/${precioId}/responder`,
        { aprobado },
      ),
    );
  }

  terminar(solicitudId: string): Promise<Solicitud> {
    return firstValueFrom(
      this.http.patch<Solicitud>(`${API_URL}/solicitudes/${solicitudId}/terminar`, {}),
    );
  }

  cancelar(solicitudId: string, motivo: string): Promise<ResolucionCancelacion> {
    return firstValueFrom(
      this.http.post<ResolucionCancelacion>(`${API_URL}/solicitudes/${solicitudId}/cancelar`, {
        motivo,
      }),
    );
  }
}
