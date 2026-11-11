import { Component, computed, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ETIQUETAS_ROL, panelDeRol } from '../core/catalogos';
import { mensajeDeError } from '../core/errores';
import type { Rol } from '../core/models';
import { ToastService } from '../core/toast.service';
import { iniciales, nombreCorto } from '../core/catalogos';

interface EnlaceNav {
  etiqueta: string;
  ruta: string;
}

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="nav">
      <div class="contenedor nav__inner">
        <a
          routerLink="/"
          class="nav__marca"
          (click)="cerrarMenu()"
        >
          <span class="nav__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M21.7 18.6 13.9 10.8a6 6 0 0 0-7.3-7.4l3 3-2.1 2.1-3-3a6 6 0 0 0 7.4 7.3l7.8 7.8a1.4 1.4 0 1 0 2-2Z"
              />
            </svg>
          </span>
          <span class="nav__nombre">
            Arréglalo <strong>Ya</strong>
          </span>
        </a>

        <nav
          class="nav__enlaces"
          [class.nav__enlaces--abiertos]="menuAbierto()"
        >
          @for (enlace of enlaces(); track enlace.ruta) {
            <a
              [routerLink]="enlace.ruta"
              routerLinkActive="activo"
              [routerLinkActiveOptions]="{ exact: enlace.ruta === '/' }"
              (click)="cerrarMenu()"
            >
              {{ enlace.etiqueta }}
            </a>
          }
        </nav>

        <div class="nav__acciones">
          @if (auth.autenticado()) {
            @if (auth.roles().length > 1) {
              <label class="nav__rol">
                <span class="solo-lectores">Rol activo</span>
                <select
                  [value]="auth.rolActivo()"
                  (change)="cambiarRol($event)"
                  [disabled]="cambiandoRol()"
                >
                  @for (rol of auth.roles(); track rol) {
                    <option [value]="rol">
                      {{ etiquetasRol[rol] }}
                    </option>
                  }
                </select>
              </label>
            }
            <a
              [routerLink]="panel()"
              class="nav__usuario"
              title="Ir a mi panel"
            >
              <span class="avatar avatar--sm">
                {{ iniciales(auth.usuario()?.nombre_completo ?? '') }}
              </span>
              <span class="nav__usuario-texto">
                <strong>{{
                  nombreCorto(auth.usuario()?.nombre_completo ?? '')
                }}</strong>
                <small>{{
                  etiquetasRol[auth.rolActivo() ?? 'CLIENTE']
                }}</small>
              </span>
            </a>
            <button
              type="button"
              class="btn btn--fantasma btn--sm"
              (click)="salir()"
            >
              Salir
            </button>
          } @else {
            <a
              routerLink="/login"
              class="btn btn--fantasma btn--sm"
            >
              Ingresar
            </a>
            <a
              routerLink="/registro"
              class="btn btn--primario btn--sm"
            >
              Crear cuenta
            </a>
          }

          <button
            type="button"
            class="nav__hamburguesa"
            [attr.aria-expanded]="menuAbierto()"
            aria-label="Abrir menú"
            (click)="menuAbierto.set(!menuAbierto())"
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path
                fill="currentColor"
                d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  `,
})
export class Navbar {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly etiquetasRol = ETIQUETAS_ROL;
  protected readonly iniciales = iniciales;
  protected readonly nombreCorto = nombreCorto;
  protected readonly menuAbierto = signal(false);
  protected readonly cambiandoRol = signal(false);

  protected readonly panel = computed(() => {
    const rol = this.auth.rolActivo();
    return rol ? panelDeRol(rol) : '/';
  });

  protected readonly enlaces = computed<EnlaceNav[]>(() => {
    if (!this.auth.autenticado()) {
      return [
        { etiqueta: 'Inicio', ruta: '/' },
        {
          etiqueta: 'Quiero trabajar',
          ruta: '/activar-trabajador',
        },
        { etiqueta: 'Términos', ruta: '/terminos' },
      ];
    }
    switch (this.auth.rolActivo()) {
      case 'TRABAJADOR':
        return [
          { etiqueta: 'Panel', ruta: '/trabajador' },
          { etiqueta: 'Trabajos', ruta: '/trabajador/trabajos' },
          {
            etiqueta: 'Mis ofertas',
            ruta: '/trabajador/mis-ofertas',
          },
          { etiqueta: 'Mi perfil', ruta: '/trabajador/perfil' },
          {
            etiqueta: 'Verificación',
            ruta: '/trabajador/verificacion',
          },
        ];
      case 'SUPERVISOR':
        return [
          { etiqueta: 'Panel', ruta: '/supervisor' },
          {
            etiqueta: 'Verificaciones',
            ruta: '/supervisor/verificaciones',
          },
        ];
      case 'SUPERADMIN':
        return [{ etiqueta: 'Panel', ruta: '/admin' }];
      default: {
        const enlaces: EnlaceNav[] = [
          { etiqueta: 'Panel', ruta: '/cliente' },
          { etiqueta: 'Publicar', ruta: '/cliente/publicar' },
          {
            etiqueta: 'Mis solicitudes',
            ruta: '/cliente/mis-solicitudes',
          },
          {
            etiqueta: 'Buscar técnicos',
            ruta: '/cliente/buscar',
          },
        ];
        if (!this.auth.roles().includes('TRABAJADOR')) {
          enlaces.push({
            etiqueta: 'Quiero trabajar',
            ruta: '/activar-trabajador',
          });
        }
        return enlaces;
      }
    }
  });

  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  protected salir(): void {
    this.cerrarMenu();
    this.auth.cerrarSesion();
  }

  protected async cambiarRol(evento: Event): Promise<void> {
    const rol = (evento.target as HTMLSelectElement).value as Rol;
    if (rol === this.auth.rolActivo()) {
      return;
    }
    this.cambiandoRol.set(true);
    try {
      await this.auth.cambiarRol(rol);
      this.toast.exito(`Ahora estás como ${ETIQUETAS_ROL[rol]}`);
      await this.router.navigate([panelDeRol(rol)]);
    } catch (error) {
      this.toast.error(mensajeDeError(error));
    } finally {
      this.cambiandoRol.set(false);
      this.cerrarMenu();
    }
  }
}
