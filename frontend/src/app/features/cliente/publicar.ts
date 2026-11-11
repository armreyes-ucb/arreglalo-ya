import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ESPECIALIDADES,
  etiquetaEspecialidad,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import {
  fechaMinimaLocal,
  formatearFechaHora,
} from '../../core/formato';
import type { Solicitud, Zona } from '../../core/models';
import { SolicitudesService } from '../../core/solicitudes.service';
import { ToastService } from '../../core/toast.service';
import { UploadsService } from '../../core/uploads.service';
import { ZonasService } from '../../core/zonas.service';
import { ImagenUrlPipe } from '../../shared/pipes';

@Component({
  selector: 'app-publicar-solicitud',
  imports: [ReactiveFormsModule, RouterLink, ImagenUrlPipe],
  template: `
    <section class="pagina">
      <div class="contenedor pagina--estrecha">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Cliente · Nueva solicitud</span>
            <h1>Publica tu solicitud</h1>
            <p>
              Mientras más claro sea el detalle, mejores ofertas
              recibirás.
            </p>
          </div>
        </div>

        @if (paso() < 4) {
          <div class="pasos">
            <span
              class="paso"
              [class.paso--activo]="paso() === 1"
              [class.paso--hecho]="paso() > 1"
            >
              <span class="paso__numero">1</span> Problema
            </span>
            <span
              class="paso"
              [class.paso--activo]="paso() === 2"
              [class.paso--hecho]="paso() > 2"
            >
              <span class="paso__numero">2</span> Ubicación y
              fotos
            </span>
            <span
              class="paso"
              [class.paso--activo]="paso() === 3"
            >
              <span class="paso__numero">3</span> Confirmar
            </span>
          </div>
        }

        @if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        }

        @if (paso() === 1) {
          <div class="tarjeta">
            <h2>¿Qué necesitas arreglar?</h2>
            <form
              class="formulario mt-2"
              [formGroup]="formulario"
              (ngSubmit)="siguiente()"
            >
              <div class="campo">
                <span class="etiqueta">Especialidad</span>
                <div class="rejilla rejilla--2">
                  @for (
                    especialidad of especialidades;
                    track especialidad.valor
                  ) {
                    <label
                      class="opcion"
                      [class.opcion--activa]="
                        formulario.controls.especialidad.value ===
                        especialidad.valor
                      "
                    >
                      <input
                        type="radio"
                        formControlName="especialidad"
                        [value]="especialidad.valor"
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

              <div class="campo">
                <label class="etiqueta" for="tipo"
                  >Título corto del problema</label
                >
                <input
                  id="tipo"
                  type="text"
                  class="input"
                  formControlName="tipo_problema"
                  placeholder="Ej. Fuga de agua en la cocina"
                  maxlength="100"
                />
                @if (
                  formulario.controls.tipo_problema.touched &&
                  formulario.controls.tipo_problema.invalid
                ) {
                  <span class="error-campo">
                    Escribe un título de al menos 3 caracteres.
                  </span>
                }
              </div>

              <div class="campo">
                <label class="etiqueta" for="descripcion"
                  >Describe el problema</label
                >
                <textarea
                  id="descripcion"
                  class="textarea"
                  formControlName="descripcion"
                  maxlength="2000"
                  placeholder="Cuéntanos qué pasa, desde cuándo y qué intentaste hacer. Mínimo 30 caracteres."
                ></textarea>
                @if (
                  formulario.controls.descripcion.touched &&
                  formulario.controls.descripcion.invalid
                ) {
                  <span class="error-campo">
                    La descripción debe tener entre 30 y 2000
                    caracteres.
                  </span>
                }
              </div>

              <label class="check">
                <input
                  type="checkbox"
                  formControlName="urgente"
                />
                <span>
                  <strong>Es urgente.</strong> Se mostrará con
                  prioridad. El recargo del 10% se aplicará sobre
                  el precio final que acuerdes con el técnico.
                </span>
              </label>

              <button
                type="submit"
                class="btn btn--primario"
              >
                Continuar
              </button>
            </form>
          </div>
        }

        @if (paso() === 2) {
          <div class="tarjeta">
            <h2>Ubicación y fotos</h2>
            <p class="small muted">
              Tu dirección exacta es privada. Solo se comparte con
              el técnico cuando confirmes el trabajo.
            </p>
            <form
              class="formulario mt-2"
              [formGroup]="formulario"
              (ngSubmit)="siguiente()"
            >
              <div class="campo">
                <label class="etiqueta" for="zona"
                  >Zona del trabajo</label
                >
                <select
                  id="zona"
                  class="select"
                  formControlName="zona_id"
                >
                  <option [value]="0">
                    Selecciona tu zona
                  </option>
                  @for (zona of zonas(); track zona.id) {
                    <option [value]="zona.id">
                      {{ zona.nombre }} · {{ zona.municipio }}
                    </option>
                  }
                </select>
                @if (
                  formulario.controls.zona_id.touched &&
                  formulario.controls.zona_id.invalid
                ) {
                  <span class="error-campo">
                    Selecciona una zona.
                  </span>
                }
              </div>

              <div class="campo">
                <label class="etiqueta" for="direccion"
                  >Dirección (se mantiene oculta)</label
                >
                <input
                  id="direccion"
                  type="text"
                  class="input"
                  formControlName="direccion_oculta"
                  placeholder="Calle, número, referencia"
                  maxlength="300"
                />
                @if (
                  formulario.controls.direccion_oculta.touched &&
                  formulario.controls.direccion_oculta.invalid
                ) {
                  <span class="error-campo">
                    La dirección debe tener al menos 5
                    caracteres.
                  </span>
                }
              </div>

              <div class="campo">
                <label class="etiqueta" for="fecha"
                  >Fecha y hora preferida</label
                >
                <input
                  id="fecha"
                  type="datetime-local"
                  class="input"
                  formControlName="fecha_cita_preferida"
                  [min]="fechaMinima"
                />
                @if (
                  formulario.controls.fecha_cita_preferida
                    .touched &&
                  formulario.controls.fecha_cita_preferida.invalid
                ) {
                  <span class="error-campo">
                    Elige una fecha y hora.
                  </span>
                }
              </div>

              <div class="campo">
                <span class="etiqueta"
                  >Fotos del problema
                  <small>(1 a 3 imágenes)</small></span
                >
                <input
                  type="file"
                  class="input"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  [disabled]="subiendoFotos()"
                  (change)="subirFotos($event)"
                />
                <span class="ayuda">
                  JPG, PNG o WebP de hasta 5 MB cada una.
                </span>
                @if (subiendoFotos()) {
                  <span class="ayuda">Subiendo fotos…</span>
                }
                @if (fotos().length > 0) {
                  <div class="galeria mt-1">
                    @for (foto of fotos(); track foto) {
                      <div>
                        <img [src]="foto | imagenUrl" alt="Foto del problema" />
                        <button
                          type="button"
                          class="enlace-boton small"
                          (click)="quitarFoto(foto)"
                        >
                          Quitar
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="fila">
                <button
                  type="button"
                  class="btn btn--contorno"
                  (click)="paso.set(1)"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  class="btn btn--primario"
                  [disabled]="subiendoFotos()"
                >
                  Revisar solicitud
                </button>
              </div>
            </form>
          </div>
        }

        @if (paso() === 3) {
          <div class="tarjeta">
            <h2>Revisa antes de publicar</h2>
            <div class="pila mt-2">
              <div class="fila fila--separada">
                <span class="muted">Especialidad</span>
                <strong>{{
                  etiquetaEspecialidad(
                    formulario.controls.especialidad.value
                  )
                }}</strong>
              </div>
              <div class="fila fila--separada">
                <span class="muted">Problema</span>
                <strong>{{
                  formulario.controls.tipo_problema.value
                }}</strong>
              </div>
              <div>
                <span class="muted">Descripción</span>
                <p style="margin: 0.3rem 0 0">
                  {{ formulario.controls.descripcion.value }}
                </p>
              </div>
              <div class="fila fila--separada">
                <span class="muted">Zona</span>
                <strong>{{ nombreZona() }}</strong>
              </div>
              <div class="fila fila--separada">
                <span class="muted">Fecha preferida</span>
                <strong>{{
                  fechaFormateada()
                }}</strong>
              </div>
              <div class="fila fila--separada">
                <span class="muted">Urgente</span>
                <strong>{{
                  formulario.controls.urgente.value
                    ? 'Sí, con prioridad'
                    : 'No'
                }}</strong>
              </div>
              <div class="fila fila--separada">
                <span class="muted">Fotos</span>
                <strong>{{ fotos().length }} adjunta(s)</strong>
              </div>
            </div>

            <div class="alerta alerta--info mt-2">
              <span>
                Al publicar, los técnicos de tu zona podrán enviarte
                ofertas. El pago del 25% por QR se realiza recién
                cuando elijas una oferta, en la siguiente etapa del
                proyecto.
              </span>
            </div>

            @if (formulario.controls.urgente.value) {
              <div class="alerta alerta--aviso">
                <span>
                  Tu solicitud es urgente: aparecerá al tope de la
                  lista. El recargo del 10% se aplicará sobre el
                  precio final que acuerdes.
                </span>
              </div>
            }

            <div class="fila mt-2">
              <button
                type="button"
                class="btn btn--contorno"
                (click)="paso.set(2)"
              >
                Atrás
              </button>
              <button
                type="button"
                class="btn btn--primario"
                [disabled]="publicando()"
                (click)="publicar()"
              >
                {{
                  publicando()
                    ? 'Publicando…'
                    : 'Publicar solicitud'
                }}
              </button>
            </div>
          </div>
        }

        @if (paso() === 4 && creada()) {
          <div class="tarjeta centrado">
            <div class="vacio__icono">✓</div>
            <h1>¡Solicitud publicada!</h1>
            <p class="muted">
              Los técnicos verificados de tu zona ya pueden verla y
              enviarte ofertas. Te avisaremos cuando lleguen.
            </p>
            <div class="alerta alerta--info" style="text-align:left">
              <span>
                <strong>{{ creada()?.tipo_problema }}</strong>
                <br />
                Estado: Publicada · Zona
                {{ creada()?.zona?.nombre }}
              </span>
            </div>
            <div class="fila" style="justify-content: center">
              <a
                [routerLink]="[
                  '/cliente/mis-solicitudes',
                  creada()?.id,
                ]"
                class="btn btn--primario"
              >
                Ver mi solicitud
              </a>
              <a
                routerLink="/cliente/mis-solicitudes"
                class="btn btn--contorno"
              >
                Ir a mis solicitudes
              </a>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class PublicarSolicitud implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly zonasService = inject(ZonasService);
  private readonly solicitudesService = inject(
    SolicitudesService,
  );
  private readonly uploads = inject(UploadsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly especialidades = ESPECIALIDADES;
  protected readonly etiquetaEspecialidad = etiquetaEspecialidad;
  protected readonly fechaMinima = fechaMinimaLocal();
  protected readonly paso = signal(1);
  protected readonly zonas = signal<Zona[]>([]);
  protected readonly fotos = signal<string[]>([]);
  protected readonly subiendoFotos = signal(false);
  protected readonly publicando = signal(false);
  protected readonly error = signal('');
  protected readonly creada = signal<Solicitud | null>(null);

  protected readonly formulario = this.fb.group({
    especialidad: ['', [Validators.required]],
    tipo_problema: [
      '',
      [Validators.required, Validators.minLength(3)],
    ],
    descripcion: [
      '',
      [Validators.required, Validators.minLength(30)],
    ],
    urgente: [false],
    zona_id: [0, [Validators.required, Validators.min(1)]],
    direccion_oculta: [
      '',
      [Validators.required, Validators.minLength(5)],
    ],
    fecha_cita_preferida: ['', [Validators.required]],
  });

  protected readonly nombreZona = computed(() => {
    const id = this.formulario.controls.zona_id.value;
    const zona = this.zonas().find((item) => item.id === id);
    return zona ? `${zona.nombre} · ${zona.municipio}` : '—';
  });

  protected readonly fechaFormateada = computed(() =>
    formatearFechaHora(
      this.formulario.controls.fecha_cita_preferida.value,
    ),
  );

  ngOnInit(): void {
    void this.cargarZonas();
  }

  protected siguiente(): void {
    this.error.set('');
    if (this.paso() === 1) {
      const controles = this.formulario.controls;
      for (const control of [
        controles.especialidad,
        controles.tipo_problema,
        controles.descripcion,
      ]) {
        control.markAsTouched();
      }
      if (
        controles.especialidad.invalid ||
        controles.tipo_problema.invalid ||
        controles.descripcion.invalid
      ) {
        this.error.set(
          'Completa la especialidad, el título y la descripción.',
        );
        return;
      }
      this.paso.set(2);
      return;
    }
    if (this.paso() === 2) {
      const controles = this.formulario.controls;
      for (const control of [
        controles.zona_id,
        controles.direccion_oculta,
        controles.fecha_cita_preferida,
      ]) {
        control.markAsTouched();
      }
      if (
        controles.zona_id.invalid ||
        controles.direccion_oculta.invalid ||
        controles.fecha_cita_preferida.invalid
      ) {
        this.error.set(
          'Completa la zona, la dirección y la fecha preferida.',
        );
        return;
      }
      if (this.fotos().length === 0) {
        this.error.set(
          'Adjunta al menos una foto del problema.',
        );
        return;
      }
      this.paso.set(3);
    }
  }

  protected async subirFotos(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivos = Array.from(entrada.files ?? []);
    entrada.value = '';
    if (archivos.length === 0) {
      return;
    }
    const espacio = 3 - this.fotos().length;
    if (espacio <= 0) {
      this.toast.info('Puedes adjuntar hasta 3 fotos.');
      return;
    }
    this.subiendoFotos.set(true);
    try {
      for (const archivo of archivos.slice(0, espacio)) {
        if (archivo.size > 5 * 1024 * 1024) {
          this.toast.error(
            `${archivo.name} supera el límite de 5 MB.`,
          );
          continue;
        }
        const url = await this.uploads.subirImagen(archivo);
        this.fotos.update((fotos) => [...fotos, url]);
      }
    } catch (error) {
      this.toast.error(mensajeDeError(error));
    } finally {
      this.subiendoFotos.set(false);
    }
  }

  protected quitarFoto(url: string): void {
    this.fotos.update((fotos) =>
      fotos.filter((foto) => foto !== url),
    );
  }

  protected async publicar(): Promise<void> {
    this.error.set('');
    this.publicando.set(true);
    try {
      const valores = this.formulario.getRawValue();
      const solicitud = await this.solicitudesService.crear({
        zona_id: Number(valores.zona_id),
        especialidad: String(valores.especialidad),
        tipo_problema: valores.tipo_problema.trim(),
        descripcion: valores.descripcion.trim(),
        fotos_urls: this.fotos(),
        direccion_oculta: valores.direccion_oculta.trim(),
        fecha_cita_preferida: new Date(
          valores.fecha_cita_preferida,
        ).toISOString(),
        urgente: valores.urgente,
      });
      this.creada.set(solicitud);
      this.paso.set(4);
      this.toast.exito('Solicitud publicada correctamente.');
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.publicando.set(false);
    }
  }

  private async cargarZonas(): Promise<void> {
    try {
      this.zonas.set(await this.zonasService.listar());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }
}
