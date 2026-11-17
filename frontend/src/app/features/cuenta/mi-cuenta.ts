import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/errores';
import type { UsuarioPublico, Rol } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { UsuariosService } from '../../core/usuarios.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-mi-cuenta',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Cuenta</span>
            <h1>Borrar mi cuenta</h1>
            <p>
              Esta acción es irreversible. Se anonimizarán tus datos personales
              y se cerrará tu sesión. Tu historial de solicitudes, pagos y
              calificaciones se conservará de forma anónima.
            </p>
          </div>
          <a [routerLink]="panel()" class="btn btn--contorno"
            >Volver a mi panel</a
          >
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando…
          </div>
        } @else {
          <div class="tarjeta mb-2">
            <div class="fila fila--separada fila--arriba">
              <div>
                <span class="avatar avatar--md">
                  {{ iniciales(usuario()?.nombre_completo ?? '') }}
                </span>
                <div class="small muted">
                  <strong>{{ usuario()?.nombre_completo }}</strong>
                  <div>{{ usuario()?.telefono }}</div>
                  <div>
                    @for (rol of usuario()?.roles ?? []; track rol) {
                      <span class="chip chip--activo">{{ rol }}</span>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="tarjeta">
            <h2>Confirmar eliminación</h2>
            <p class="small muted mt-1">
              Escribe tu contraseña actual para confirmar que deseas borrar tu
              cuenta permanentemente.
            </p>
            <div class="campo mt-2">
              <label class="etiqueta" for="password">Contraseña</label>
              <input
                id="password"
                type="password"
                class="input"
                [(ngModel)]="password"
                placeholder="Tu contraseña actual"
                autocomplete="current-password"
              />
            </div>
            <div class="fila mt-2" style="justify-content: flex-end">
              <button
                type="button"
                class="btn btn--contorno"
                (click)="cancelar()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn btn--peligro"
                [disabled]="borrando() || !password().trim()"
                (click)="borrar()"
              >
                {{ borrando() ? 'Borrando…' : 'Borrar mi cuenta' }}
              </button>
            </div>
            @if (error()) {
              <div class="alerta alerta--error mt-2">
                <span>{{ error() }}</span>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class MiCuenta implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly toast = inject(ToastService);

  protected readonly usuario = signal<UsuarioPublico | null>(null);
  protected readonly cargando = signal(true);
  protected readonly borrando = signal(false);
  protected readonly password = signal('');
  protected readonly error = signal('');

  protected readonly panel = computed(() => {
    const rol = this.auth.rolActivo();
    return rol ? this.panelDeRol(rol) : '/';
  });

  protected readonly panelDeRol = (rol: Rol): string => {
    switch (rol) {
      case 'TRABAJADOR':
        return '/trabajador';
      case 'SUPERVISOR':
        return '/supervisor';
      case 'SUPERADMIN':
        return '/admin';
      default:
        return '/cliente';
    }
  };

  protected readonly iniciales = (nombre: string): string =>
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.usuario.set(this.auth.usuario());
    } finally {
      this.cargando.set(false);
    }
  }

  protected cancelar(): void {
    this.password.set('');
    this.error.set('');
    const panel = this.panel();
    if (panel !== '/') {
      window.location.href = panel;
    }
  }

  protected async borrar(): Promise<void> {
    if (!this.password().trim()) return;

    this.borrando.set(true);
    this.error.set('');
    try {
      await this.usuariosService.eliminarCuenta({
        password: this.password(),
      });
      this.toast.exito('Cuenta borrada correctamente. Hasta pronto.');
      this.auth.cerrarSesion();
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.borrando.set(false);
    }
  }
}