import { HttpClient } from '@angular/common/http';
import {
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { API_URL } from './api';
import type {
  ActivacionTrabajadorResponse,
  AuthTokenResponse,
  Rol,
  Sesion,
  SolicitarCodigoResponse,
  UsuarioPublico,
} from './models';

const CLAVE_SESION = 'arreglalo_ya_sesion';

interface RegistroPayload {
  nombre_completo: string;
  telefono: string;
  password: string;
  acepto_terminos: boolean;
  codigo: string;
}

interface ActivacionPayload {
  acepto_contrato_digital: boolean;
  especialidades: string[];
  zonas: number[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _sesion = signal<Sesion | null>(this.leerSesion());
  private readonly _cargando = signal(false);

  readonly sesion = this._sesion.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly usuario = computed(() => this._sesion()?.usuario ?? null);
  readonly rolActivo = computed(() => this._sesion()?.rolActivo ?? null);
  readonly roles = computed(
    () => this._sesion()?.usuario.roles ?? [],
  );
  readonly autenticado = computed(() => this._sesion() !== null);
  readonly token = computed(() => this._sesion()?.token ?? null);

  async solicitarCodigo(
    telefono: string,
  ): Promise<SolicitarCodigoResponse> {
    return new Promise((resolve, reject) => {
      this.http
        .post<SolicitarCodigoResponse>(
          `${API_URL}/auth/solicitar-codigo`,
          { telefono },
        )
        .subscribe({ next: resolve, error: reject });
    });
  }

  async registro(payload: RegistroPayload): Promise<UsuarioPublico> {
    return new Promise((resolve, reject) => {
      this.http
        .post<UsuarioPublico>(`${API_URL}/auth/registro`, payload)
        .subscribe({ next: resolve, error: reject });
    });
  }

  async login(
    telefono: string,
    password: string,
  ): Promise<AuthTokenResponse> {
    this._cargando.set(true);
    try {
      const respuesta = await new Promise<AuthTokenResponse>(
        (resolve, reject) => {
          this.http
            .post<AuthTokenResponse>(`${API_URL}/auth/login`, {
              telefono,
              password,
            })
            .subscribe({ next: resolve, error: reject });
        },
      );
      this.guardarSesion(respuesta);
      return respuesta;
    } finally {
      this._cargando.set(false);
    }
  }

  async cambiarRol(rol: Rol): Promise<AuthTokenResponse> {
    const respuesta = await new Promise<AuthTokenResponse>(
      (resolve, reject) => {
        this.http
          .patch<AuthTokenResponse>(
            `${API_URL}/usuarios/cambiar-rol`,
            { rol },
          )
          .subscribe({ next: resolve, error: reject });
      },
    );
    this.guardarSesion(respuesta);
    return respuesta;
  }

  async activarTrabajador(
    payload: ActivacionPayload,
  ): Promise<ActivacionTrabajadorResponse> {
    const respuesta = await new Promise<ActivacionTrabajadorResponse>(
      (resolve, reject) => {
        this.http
          .post<ActivacionTrabajadorResponse>(
            `${API_URL}/usuarios/activar-trabajador`,
            payload,
          )
          .subscribe({ next: resolve, error: reject });
      },
    );
    this.guardarSesion(respuesta);
    return respuesta;
  }

  cerrarSesion(redirigir = true): void {
    this._sesion.set(null);
    try {
      localStorage.removeItem(CLAVE_SESION);
    } catch {
      // almacenamiento no disponible
    }
    if (redirigir) {
      void this.router.navigate(['/']);
    }
  }

  tieneRol(rol: Rol): boolean {
    return this.roles().includes(rol);
  }

  private guardarSesion(respuesta: AuthTokenResponse): void {
    const sesion: Sesion = {
      token: respuesta.access_token,
      usuario: respuesta.usuario,
      rolActivo: respuesta.rol_activo,
      expiraEn: this.expiracionDe(respuesta.access_token),
    };
    this._sesion.set(sesion);
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    } catch {
      // almacenamiento no disponible
    }
  }

  private leerSesion(): Sesion | null {
    try {
      const crudo = localStorage.getItem(CLAVE_SESION);
      if (!crudo) {
        return null;
      }
      const sesion = JSON.parse(crudo) as Sesion;
      if (!sesion.token || !sesion.usuario || !sesion.rolActivo) {
        return null;
      }
      if (sesion.expiraEn && sesion.expiraEn < Date.now()) {
        localStorage.removeItem(CLAVE_SESION);
        return null;
      }
      return sesion;
    } catch {
      return null;
    }
  }

  private expiracionDe(token: string): number {
    try {
      const parte = token.split('.')[1];
      if (!parte) {
        return Date.now() + 7 * 24 * 60 * 60 * 1000;
      }
      const normalizado = parte
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(parte.length / 4) * 4, '=');
      const payload = JSON.parse(atob(normalizado)) as {
        exp?: number;
      };
      return payload.exp
        ? payload.exp * 1000
        : Date.now() + 7 * 24 * 60 * 60 * 1000;
    } catch {
      return Date.now() + 7 * 24 * 60 * 60 * 1000;
    }
  }
}
