import {
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { panelDeRol } from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor pagina--estrecha">
        <div class="tarjeta">
          <div class="centrado mb-2">
            <span class="monograma">AY</span>
            <h1 class="mt-2">Bienvenido de nuevo</h1>
            <p class="muted">
              Ingresa con tu teléfono y contraseña para continuar.
            </p>
          </div>

          @if (aviso()) {
            <div class="alerta alerta--info">
              <span>{{ aviso() }}</span>
            </div>
          }

          @if (error()) {
            <div class="alerta alerta--error">
              <span>{{ error() }}</span>
            </div>
          }

          <form
            class="formulario"
            [formGroup]="formulario"
            (ngSubmit)="ingresar()"
          >
            <div class="campo">
              <label class="etiqueta" for="telefono"
                >Teléfono</label
              >
              <input
                id="telefono"
                type="tel"
                class="input"
                formControlName="telefono"
                placeholder="+591 700 00000"
                autocomplete="tel"
              />
              @if (
                formulario.controls.telefono.touched &&
                formulario.controls.telefono.invalid
              ) {
                <span class="error-campo">
                  Ingresa un teléfono válido (7 a 15 dígitos).
                </span>
              }
            </div>

            <div class="campo">
              <label class="etiqueta" for="password"
                >Contraseña</label
              >
              <input
                id="password"
                type="password"
                class="input"
                formControlName="password"
                placeholder="Tu contraseña"
                autocomplete="current-password"
              />
              @if (
                formulario.controls.password.touched &&
                formulario.controls.password.invalid
              ) {
                <span class="error-campo">
                  Escribe tu contraseña.
                </span>
              }
            </div>

            <button
              type="submit"
              class="btn btn--primario btn--bloque"
              [disabled]="auth.cargando()"
            >
              {{ auth.cargando() ? 'Ingresando…' : 'Ingresar' }}
            </button>
          </form>

          <p class="centrado small muted mt-3">
            ¿Aún no tienes cuenta?
            <a
              [routerLink]="['/registro']"
              [queryParams]="
                volver() ? { volver: volver() } : {}
              "
              >Crear una cuenta gratis</a
            >
          </p>
          <p class="centrado tiny muted">
            Al ingresar aceptas los
            <a routerLink="/terminos">términos y condiciones</a>.
          </p>
        </div>
      </div>
    </section>
  `,
})
export class Login implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly error = signal('');
  protected readonly aviso = signal('');
  protected readonly volver = signal('');

  protected readonly formulario = this.fb.group({
    telefono: ['', [Validators.required, Validators.minLength(7)]],
    password: ['', [Validators.required, Validators.minLength(1)]],
  });

  ngOnInit(): void {
    const motivo =
      this.ruta.snapshot.queryParamMap.get('motivo');
    if (motivo === 'sesion-expirada') {
      this.aviso.set(
        'Tu sesión expiró. Vuelve a ingresar para continuar.',
      );
    }
    const registro =
      this.ruta.snapshot.queryParamMap.get('registro');
    if (registro === 'exitoso') {
      this.aviso.set(
        'Tu cuenta fue creada. Ingresa con tu teléfono y contraseña.',
      );
    }
    const volver = this.ruta.snapshot.queryParamMap.get('volver');
    if (volver && this.esRutaInterna(volver)) {
      this.volver.set(volver);
      if (!this.aviso() && volver === '/activar-trabajador') {
        this.aviso.set(
          'Ingresa o crea una cuenta para activarte como trabajador.',
        );
      }
    }
  }

  protected async ingresar(): Promise<void> {
    this.error.set('');
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { telefono, password } =
      this.formulario.getRawValue();
    try {
      const respuesta = await this.auth.login(
        telefono,
        password,
      );
      this.toast.exito(
        `Hola, ${respuesta.usuario.nombre_completo.split(' ')[0]}`,
      );
      const destino =
        this.volver() || panelDeRol(respuesta.rol_activo);
      await this.router.navigateByUrl(destino);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }

  private esRutaInterna(ruta: string): boolean {
    return ruta.startsWith('/') && !ruta.startsWith('//');
  }
}
