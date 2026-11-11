import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import type { Zona } from './models';

@Injectable({ providedIn: 'root' })
export class ZonasService {
  private readonly http = inject(HttpClient);
  private cache: Zona[] | null = null;

  async listar(forzar = false): Promise<Zona[]> {
    if (this.cache && !forzar) {
      return this.cache;
    }
    const zonas = await firstValueFrom(
      this.http.get<Zona[]>(`${API_URL}/zonas`),
    );
    this.cache = zonas;
    return zonas;
  }
}
