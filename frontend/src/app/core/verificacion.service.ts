import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type {
  DecisionRevision,
  EstadoVerificacion,
  ExpedienteVerificacion,
  RespuestaCargaDocumentos,
  ResultadoRevision,
} from './models';

export interface CargaDocumentosPayload {
  banco: string;
  numero_cuenta: string;
  titular: string;
  vence_antecedentes?: string;
  archivos: Partial<Record<string, File>>;
}

export interface RevisionPayload {
  decision: DecisionRevision;
  nivel_verificacion?: number;
  motivo_rechazo?: string;
  vence_antecedentes?: string;
}

@Injectable({ providedIn: 'root' })
export class VerificacionService {
  private readonly http = inject(HttpClient);

  estado(): Promise<EstadoVerificacion> {
    return firstValueFrom(
      this.http.get<EstadoVerificacion>(
        `${API_URL}/verificacion/estado`,
      ),
    );
  }

  cargarDocumentos(
    payload: CargaDocumentosPayload,
  ): Promise<RespuestaCargaDocumentos> {
    const datos = new FormData();
    datos.append('banco', payload.banco);
    datos.append('numero_cuenta', payload.numero_cuenta);
    datos.append('titular', payload.titular);
    if (payload.vence_antecedentes) {
      datos.append(
        'vence_antecedentes',
        payload.vence_antecedentes,
      );
    }
    for (const [campo, archivo] of Object.entries(
      payload.archivos,
    )) {
      if (archivo) {
        datos.append(campo, archivo);
      }
    }
    return firstValueFrom(
      this.http.post<RespuestaCargaDocumentos>(
        `${API_URL}/verificacion/documentos`,
        datos,
      ),
    );
  }

  bandeja(): Promise<ExpedienteVerificacion[]> {
    return firstValueFrom(
      this.http.get<ExpedienteVerificacion[]>(
        `${API_URL}/verificacion/bandeja`,
      ),
    );
  }

  revisar(
    trabajadorId: string,
    payload: RevisionPayload,
  ): Promise<ResultadoRevision> {
    return firstValueFrom(
      this.http.patch<ResultadoRevision>(
        `${API_URL}/verificacion/${trabajadorId}/revisar`,
        payload,
      ),
    );
  }

  descargarDocumento(
    trabajadorId: string,
    documentoId: string,
  ): Promise<Blob> {
    return firstValueFrom(
      this.http.get(
        `${API_URL}/verificacion/${trabajadorId}/documentos/${documentoId}/archivo`,
        { responseType: 'blob' },
      ),
    );
  }
}
