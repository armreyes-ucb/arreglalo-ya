import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type {
  UsuarioPublico,
  Zona,
  ZonaAdmin,
  CoberturaZona,
  ConfiguracionPlataforma,
  CambioConfiguracion,
  ReporteAdministrativo,
  ReporteSolicitudes,
  ReporteComisiones,
  ReporteDevoluciones,
  ReporteReclamos,
  SupervisorCreado,
} from './models';

export interface CrearSupervisorPayload {
  telefono: string;
  nombre_completo?: string;
  password?: string;
}

export interface ActualizarSupervisorPayload {
  nombre_completo?: string;
  password?: string;
}

export interface CrearZonaPayload {
  nombre: string;
  otb: string;
  municipio: string;
  zonas_vecinas?: string[];
}

export interface ActualizarZonaPayload {
  nombre?: string;
  otb?: string;
  municipio?: string;
  zonas_vecinas?: string[];
}

export interface ReporteQueryPayload {
  desde?: string;
  hasta?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  listarSupervisores(): Promise<UsuarioPublico[]> {
    return firstValueFrom(this.http.get<UsuarioPublico[]>(`${API_URL}/admin/supervisores`));
  }

  crearSupervisor(payload: CrearSupervisorPayload): Promise<SupervisorCreado> {
    return firstValueFrom(
      this.http.post<SupervisorCreado>(`${API_URL}/admin/supervisores`, payload),
    );
  }

  actualizarSupervisor(id: string, payload: ActualizarSupervisorPayload): Promise<UsuarioPublico> {
    return firstValueFrom(
      this.http.patch<UsuarioPublico>(`${API_URL}/admin/supervisores/${id}`, payload),
    );
  }

  desactivarSupervisor(id: string): Promise<UsuarioPublico> {
    return firstValueFrom(
      this.http.patch<UsuarioPublico>(`${API_URL}/admin/supervisores/${id}/desactivar`, {}),
    );
  }

  reactivarSupervisor(id: string): Promise<UsuarioPublico> {
    return firstValueFrom(
      this.http.patch<UsuarioPublico>(`${API_URL}/admin/supervisores/${id}/reactivar`, {}),
    );
  }

  listarZonas(): Promise<ZonaAdmin[]> {
    return firstValueFrom(this.http.get<ZonaAdmin[]>(`${API_URL}/admin/zonas`));
  }

  crearZona(payload: CrearZonaPayload): Promise<Zona> {
    return firstValueFrom(this.http.post<Zona>(`${API_URL}/admin/zonas`, payload));
  }

  actualizarZona(id: number, payload: ActualizarZonaPayload): Promise<Zona> {
    return firstValueFrom(this.http.patch<Zona>(`${API_URL}/admin/zonas/${id}`, payload));
  }

  cambiarEstadoZona(id: number, activa: boolean): Promise<ZonaAdmin> {
    return firstValueFrom(
      this.http.patch<ZonaAdmin>(`${API_URL}/admin/zonas/${id}/estado`, { activa }),
    );
  }

  coberturaZona(id: number): Promise<CoberturaZona> {
    return firstValueFrom(this.http.get<CoberturaZona>(`${API_URL}/admin/zonas/${id}/cobertura`));
  }

  eliminarZona(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_URL}/admin/zonas/${id}`));
  }

  obtenerConfiguracion(): Promise<ConfiguracionPlataforma> {
    return firstValueFrom(this.http.get<ConfiguracionPlataforma>(`${API_URL}/admin/configuracion`));
  }

  historialConfiguracion(): Promise<CambioConfiguracion[]> {
    return firstValueFrom(
      this.http.get<CambioConfiguracion[]>(`${API_URL}/admin/configuracion/historial`),
    );
  }

  actualizarConfiguracion(
    payload: Partial<ConfiguracionPlataforma>,
  ): Promise<ConfiguracionPlataforma> {
    return firstValueFrom(
      this.http.put<ConfiguracionPlataforma>(`${API_URL}/admin/configuracion`, payload),
    );
  }

  reporteGeneral(payload?: ReporteQueryPayload): Promise<ReporteAdministrativo> {
    let params = new HttpParams();
    if (payload?.desde) params = params.set('desde', payload.desde);
    if (payload?.hasta) params = params.set('hasta', payload.hasta);
    return firstValueFrom(
      this.http.get<ReporteAdministrativo>(`${API_URL}/admin/reportes`, {
        params,
      }),
    );
  }

  reporteSolicitudes(payload?: ReporteQueryPayload): Promise<ReporteSolicitudes> {
    let params = new HttpParams();
    if (payload?.desde) params = params.set('desde', payload.desde);
    if (payload?.hasta) params = params.set('hasta', payload.hasta);
    return firstValueFrom(
      this.http.get<ReporteSolicitudes>(`${API_URL}/admin/reportes/solicitudes`, { params }),
    );
  }

  reporteComisiones(payload?: ReporteQueryPayload): Promise<ReporteComisiones> {
    let params = new HttpParams();
    if (payload?.desde) params = params.set('desde', payload.desde);
    if (payload?.hasta) params = params.set('hasta', payload.hasta);
    return firstValueFrom(
      this.http.get<ReporteComisiones>(`${API_URL}/admin/reportes/comisiones`, { params }),
    );
  }

  reporteDevoluciones(payload?: ReporteQueryPayload): Promise<ReporteDevoluciones> {
    let params = new HttpParams();
    if (payload?.desde) params = params.set('desde', payload.desde);
    if (payload?.hasta) params = params.set('hasta', payload.hasta);
    return firstValueFrom(
      this.http.get<ReporteDevoluciones>(`${API_URL}/admin/reportes/devoluciones`, { params }),
    );
  }

  reporteReclamos(payload?: ReporteQueryPayload): Promise<ReporteReclamos> {
    let params = new HttpParams();
    if (payload?.desde) params = params.set('desde', payload.desde);
    if (payload?.hasta) params = params.set('hasta', payload.hasta);
    return firstValueFrom(
      this.http.get<ReporteReclamos>(`${API_URL}/admin/reportes/reclamos`, { params }),
    );
  }
}
