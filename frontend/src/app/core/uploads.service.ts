import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly http = inject(HttpClient);

  async subirImagen(archivo: File): Promise<string> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    const respuesta = await firstValueFrom(
      this.http.post<{ url: string }>(
        `${API_URL}/uploads/imagen`,
        datos,
      ),
    );
    return respuesta.url;
  }
}
