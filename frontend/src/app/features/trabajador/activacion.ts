import {
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ESPECIALIDADES } from '../../core/catalogos';
import { CONTRATO_TRABAJADOR } from '../../core/contrato-trabajador';
import { mensajeDeError } from '../../core/errores';
import type { Especialidad, Zona } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { ZonasService } from '../../core/zonas.service';

@Component({
  selector: 'app-activacion-trabajador',
  imports: [RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor pagina--estrecha">
        <div class="cabecera-pagina">
          <div>
            <a routerLink="/cliente" class="migaja"
              >← Volver al panel</a
            >
            <h1>Actívate como trabajador</h1>
            <p>
              Cuéntanos qué servicios ofreces y en qué zonas
              trabajas. Después cargarás tus documentos para la
              verificación.
            </p>
          </div>
        </div>

        @if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        }

        <div class="tarjeta">
          <div class="campo">
            <span class="etiqueta">Especialidades</span>
            <div class="opciones">
              @for (
                especialidad of especialidades;
                track especialidad.valor
              ) {
                <label
                  class="opcion"
                  [class.opcion--activa]="
                    seleccionadas().includes(especialidad.valor)
                  "
                >
                  <input
                    type="checkbox"
                    [checked]="
                      seleccionadas().includes(especialidad.valor)
                    "
                    (change)="
                      alternarEspecialidad(especialidad.valor)
                    "
                  />
                  <span>
                    <strong>{{
                      especialidad.etiqueta
                    }}</strong>
                    <span class="small muted" style="display:block">
                      {{ especialidad.descripcion }}
                    </span>
                  </span>
                </label>
              }
            </div>
          </div>

          <div class="campo mt-3">
            <span class="etiqueta">Zonas donde trabajas</span>
            @if (zonas().length === 0) {
              <p class="small muted">Cargando zonas…</p>
            } @else {
              <div class="opciones">
                @for (zona of zonas(); track zona.id) {
                  <label
                    class="opcion"
                    [class.opcion--activa]="
                      zonasSeleccionadas().includes(zona.id)
                    "
                  >
                    <input
                      type="checkbox"
                      [checked]="
                        zonasSeleccionadas().includes(zona.id)
                      "
                      (change)="alternarZona(zona.id)"
                    />
                    <span>
                      <strong>{{ zona.nombre }}</strong>
                      <span class="small muted" style="display:block">
                        {{ zona.otb }} · {{ zona.municipio }}
                      </span>
                    </span>
                  </label>
                }
              </div>
            }
          </div>

          <div class="fila fila--separada mt-3">
            <div>
              <span class="etiqueta">Contrato digital</span>
              <p class="small muted" style="margin: 0">
                Léelo antes de aceptar las condiciones del
                trabajador.
              </p>
            </div>
            <button
              type="button"
              class="btn btn--contorno btn--sm"
              (click)="abrirContrato()"
            >
              Leer contrato
            </button>
          </div>

          <label class="check mt-2">
            <input
              type="checkbox"
              [checked]="aceptaContrato()"
              [disabled]="!contratoLeido()"
              (change)="aceptaContrato.set(!aceptaContrato())"
            />
            <span>
              Acepto el contrato digital de trabajador y las reglas
              de la plataforma, incluida la comisión del 5% sobre el
              pago inicial.
            </span>
          </label>
          @if (!contratoLeido()) {
            <span class="ayuda">
              Abre y lee el contrato para habilitar la aceptación.
            </span>
          }

          <div class="alerta alerta--info mt-2">
            <span>
              Tu perfil quedará <strong>pendiente</strong> hasta que
              un supervisor apruebe tus documentos. Solo entonces
              podrás enviar ofertas.
            </span>
          </div>

          <button
            type="button"
            class="btn btn--primario btn--bloque mt-2"
            [disabled]="guardando()"
            (click)="activar()"
          >
            {{
              guardando()
                ? 'Activando…'
                : 'Activar rol de trabajador'
            }}
          </button>
        </div>
      </div>
    </section>

    @if (contratoAbierto()) {
      <div class="modal-fondo" (click)="cerrarContrato()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-contrato"
          (click)="$event.stopPropagation()"
        >
          <div class="fila fila--separada">
            <h2 id="titulo-contrato" style="margin: 0">
              Contrato digital de trabajador
            </h2>
            <button
              type="button"
              class="enlace-boton"
              (click)="cerrarContrato()"
            >
              Cerrar
            </button>
          </div>

          <div class="pila mt-2">
            @for (seccion of contrato; track seccion.titulo) {
              <section>
                <h3>{{ seccion.titulo }}</h3>
                @for (
                  parrafo of seccion.parrafos;
                  track $index
                ) {
                  <p class="small muted">{{ parrafo }}</p>
                }
                @if (seccion.puntos?.length) {
                  <ul
                    class="small muted"
                    style="padding-left: 1.1rem"
                  >
                    @for (
                      punto of seccion.puntos;
                      track $index
                    ) {
                      <li>{{ punto }}</li>
                    }
                  </ul>
                }
              </section>
            }
          </div>

          <button
            type="button"
            class="btn btn--primario btn--bloque mt-2"
            (click)="entendidoContrato()"
          >
            Entendido, continuar
          </button>
        </div>
      </div>
    }
  `,
})
export class ActivacionTrabajador {
  private readonly auth = inject(AuthService);
  private readonly zonasService = inject(ZonasService);
  private readonly trabajadoresService = inject(
    TrabajadoresService,
  );
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly especialidades = ESPECIALIDADES;
  protected readonly contrato = CONTRATO_TRABAJADOR;
  protected readonly zonas = signal<Zona[]>([]);
  protected readonly seleccionadas = signal<Especialidad[]>([]);
  protected readonly zonasSeleccionadas = signal<number[]>([]);
  protected readonly aceptaContrato = signal(false);
  protected readonly contratoAbierto = signal(false);
  protected readonly contratoLeido = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');

  constructor() {
    void this.cargar();
  }

  protected alternarEspecialidad(
    especialidad: Especialidad,
  ): void {
    this.seleccionadas.update((actuales) =>
      actuales.includes(especialidad)
        ? actuales.filter((item) => item !== especialidad)
        : [...actuales, especialidad],
    );
  }

  protected alternarZona(zonaId: number): void {
    this.zonasSeleccionadas.update((actuales) =>
      actuales.includes(zonaId)
        ? actuales.filter((item) => item !== zonaId)
        : [...actuales, zonaId],
    );
  }

  @HostListener('document:keydown.escape')
  protected cerrarContratoConEscape(): void {
    if (this.contratoAbierto()) {
      this.cerrarContrato();
    }
  }

  protected abrirContrato(): void {
    this.contratoAbierto.set(true);
  }

  protected cerrarContrato(): void {
    this.contratoAbierto.set(false);
  }

  protected entendidoContrato(): void {
    this.contratoLeido.set(true);
    this.contratoAbierto.set(false);
  }

  protected async activar(): Promise<void> {
    this.error.set('');
    if (this.seleccionadas().length === 0) {
      this.error.set(
        'Selecciona al menos una especialidad.',
      );
      return;
    }
    if (this.zonasSeleccionadas().length === 0) {
      this.error.set('Selecciona al menos una zona.');
      return;
    }
    if (!this.contratoLeido() || !this.aceptaContrato()) {
      this.error.set(
        'Debes leer y aceptar el contrato digital.',
      );
      return;
    }
    this.guardando.set(true);
    try {
      await this.auth.activarTrabajador({
        acepto_contrato_digital: true,
        especialidades: this.seleccionadas(),
        zonas: this.zonasSeleccionadas(),
      });
      this.toast.exito(
        'Rol de trabajador activado. Ahora carga tus documentos.',
      );
      await this.router.navigate([
        '/trabajador/verificacion',
      ]);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  private async cargar(): Promise<void> {
    try {
      this.zonas.set(await this.zonasService.listar());
      try {
        await this.trabajadoresService.perfilPropio();
        this.toast.info('Tu perfil de trabajador ya está activo.');
        await this.router.navigate(['/trabajador']);
      } catch {
        // el perfil todavía no existe: continuar con la activación
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }
}
