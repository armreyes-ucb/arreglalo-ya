import {
  Component,
  OnInit,
  inject,
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
import { mensajeDeError } from '../../core/errores';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor pagina--estrecha">
        <div class="tarjeta">
          <div class="centrado mb-2">
            <span class="monograma">AY</span>
            <h1 class="mt-2">Crear cuenta</h1>
            <p class="muted">
              Regístrate en menos de un minuto. Te enviaremos un
              código por SMS para confirmar tu teléfono.
            </p>
          </div>

          <div class="pasos" style="justify-content: center">
            <span
              class="paso"
              [class.paso--activo]="paso() === 1"
              [class.paso--hecho]="paso() === 2"
            >
              <span class="paso__numero">1</span>
              Tus datos
            </span>
            <span
              class="paso"
              [class.paso--activo]="paso() === 2"
            >
              <span class="paso__numero">2</span>
              Código SMS
            </span>
          </div>

          @if (error()) {
            <div class="alerta alerta--error">
              <span>{{ error() }}</span>
            </div>
          }

          @if (volver() === '/activar-trabajador') {
            <div class="alerta alerta--info">
              <span>
                Crea tu cuenta para continuar con la activación
                como trabajador.
              </span>
            </div>
          }

          @if (paso() === 1) {
            <form
              class="formulario"
              [formGroup]="datos"
              (ngSubmit)="continuar()"
            >
              <div class="campo">
                <label class="etiqueta" for="nombre"
                  >Nombre completo</label
                >
                <input
                  id="nombre"
                  type="text"
                  class="input"
                  formControlName="nombre_completo"
                  placeholder="Ej. María Fernanda Quispe"
                  autocomplete="name"
                />
                @if (
                  datos.controls.nombre_completo.touched &&
                  datos.controls.nombre_completo.invalid
                ) {
                  <span class="error-campo">
                    Escribe tu nombre completo (mínimo 3
                    caracteres).
                  </span>
                }
              </div>

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
                <span class="ayuda">
                  Lo usaremos para el código de verificación y
                  como contacto.
                </span>
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
                  placeholder="Mínimo 8 caracteres"
                  autocomplete="new-password"
                />
                @if (
                  datos.controls.password.touched &&
                  datos.controls.password.invalid
                ) {
                  <span class="error-campo">
                    La contraseña debe tener al menos 8
                    caracteres.
                  </span>
                }
              </div>

              <label class="check">
                <input
                  type="checkbox"
                  formControlName="acepto_terminos"
                />
                <span>
                  Acepto los
                  <a routerLink="/terminos" target="_blank"
                    >términos y condiciones</a
                  >
                  y el tratamiento de mis datos para la
                  prestación del servicio.
                </span>
              </label>
              @if (
                datos.controls.acepto_terminos.touched &&
                datos.controls.acepto_terminos.invalid
              ) {
                <span class="error-campo">
                  Debes aceptar los términos para continuar.
                </span>
              }

              <button
                type="submit"
                class="btn btn--primario btn--bloque"
                [disabled]="enviandoCodigo()"
              >
                {{
                  enviandoCodigo()
                    ? 'Enviando código…'
                    : 'Enviar código SMS'
                }}
              </button>
            </form>
          } @else {
            <form
              class="formulario"
              [formGroup]="codigoForm"
              (ngSubmit)="confirmar()"
            >
              @if (codigoDesarrollo()) {
                <div class="alerta alerta--info">
                  <span>
                    Entorno de desarrollo: tu código es
                    <strong>{{ codigoDesarrollo() }}</strong>
                  </span>
                </div>
              }
              <div class="campo">
                <label class="etiqueta" for="codigo"
                  >Código de 6 dígitos</label
                >
                <input
                  id="codigo"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  class="input"
                  formControlName="codigo"
                  placeholder="123456"
                  autocomplete="one-time-code"
                />
                <span class="ayuda">
                  Lo enviamos al {{ telefonoIngresado() }}.
                </span>
              </div>

              <button
                type="submit"
                class="btn btn--primario btn--bloque"
                [disabled]="creando()"
              >
                {{
                  creando()
                    ? 'Creando tu cuenta…'
                    : 'Confirmar y crear cuenta'
                }}
              </button>

              <div class="fila fila--separada">
                <button
                  type="button"
                  class="enlace-boton"
                  (click)="volverDatos()"
                >
                  Cambiar mis datos
                </button>
                <button
                  type="button"
                  class="enlace-boton"
                  [disabled]="enviandoCodigo()"
                  (click)="reenviarCodigo()"
                >
                  Reenviar código
                </button>
              </div>
            </form>
          }

          <p class="centrado small muted mt-3">
            ¿Ya tienes cuenta?
            <a routerLink="/login">Ingresar</a>
          </p>
        </div>
      </div>
    </section>
  `,
})
export class Registro implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly paso = signal<1 | 2>(1);
  protected readonly error = signal('');
  protected readonly enviandoCodigo = signal(false);
  protected readonly creando = signal(false);
  protected readonly telefonoIngresado = signal('');
  protected readonly codigoDesarrollo = signal('');
  protected readonly volver = signal('');

  protected readonly datos = this.fb.group({
    nombre_completo: [
      '',
      [Validators.required, Validators.minLength(3)],
    ],
    telefono: [
      '',
      [Validators.required, Validators.minLength(7)],
    ],
    password: [
      '',
      [Validators.required, Validators.minLength(8)],
    ],
    acepto_terminos: [false, [Validators.requiredTrue]],
  });

  protected readonly codigoForm = this.fb.group({
    codigo: [
      '',
      [Validators.required, Validators.pattern(/^\d{6}$/)],
    ],
  });

  ngOnInit(): void {
    const volver = this.ruta.snapshot.queryParamMap.get('volver');
    if (volver && this.esRutaInterna(volver)) {
      this.volver.set(volver);
    }
  }

  protected async continuar(): Promise<void> {
    this.error.set('');
    if (this.datos.invalid) {
      this.datos.markAllAsTouched();
      return;
    }
    this.enviandoCodigo.set(true);
    try {
      const { telefono } = this.datos.getRawValue();
      const respuesta = await this.auth.solicitarCodigo(telefono);
      this.telefonoIngresado.set(telefono);
      this.codigoDesarrollo.set(
        respuesta.codigo_desarrollo ?? '',
      );
      this.paso.set(2);
      this.toast.info(
        'Código enviado. Revisa los mensajes de tu teléfono.',
      );
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.enviandoCodigo.set(false);
    }
  }

  protected async reenviarCodigo(): Promise<void> {
    this.enviandoCodigo.set(true);
    try {
      const respuesta = await this.auth.solicitarCodigo(
        this.telefonoIngresado(),
      );
      this.codigoDesarrollo.set(
        respuesta.codigo_desarrollo ?? '',
      );
      this.toast.info('Código reenviado.');
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.enviandoCodigo.set(false);
    }
  }

  protected volverDatos(): void {
    this.error.set('');
    this.paso.set(1);
  }

  protected async confirmar(): Promise<void> {
    this.error.set('');
    if (this.codigoForm.invalid) {
      this.codigoForm.markAllAsTouched();
      return;
    }
    this.creando.set(true);
    const valores = this.datos.getRawValue();
    try {
      await this.auth.registro({
        nombre_completo: valores.nombre_completo.trim(),
        telefono: valores.telefono,
        password: valores.password,
        acepto_terminos: valores.acepto_terminos,
        codigo: this.codigoForm.getRawValue().codigo,
      });
      try {
        await this.auth.login(
          valores.telefono,
          valores.password,
        );
        this.toast.exito('Tu cuenta fue creada. ¡Bienvenido!');
        await this.router.navigateByUrl(
          this.volver() || '/cliente',
        );
      } catch {
        this.toast.exito(
          'Tu cuenta fue creada. Ingresa con tu contraseña.',
        );
        await this.router.navigate(
          ['/login'],
          this.volver()
            ? { queryParams: { volver: this.volver() } }
            : {},
        );
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.creando.set(false);
    }
  }

  private esRutaInterna(ruta: string): boolean {
    return ruta.startsWith('/') && !ruta.startsWith('//');
  }
}
