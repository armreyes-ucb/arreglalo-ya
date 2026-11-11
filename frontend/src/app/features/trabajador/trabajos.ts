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
import { RouterLink } from '@angular/router';
import {
  ESPECIALIDADES,
  etiquetaEstadoSolicitud,
  etiquetaEspecialidad,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import {
  fechaMinimaLocal,
  formatearFechaHora,
} from '../../core/formato';
import type {
  PerfilTrabajadorPropio,
  SolicitudDisponible,
  Zona,
} from '../../core/models';
import { SolicitudesService } from '../../core/solicitudes.service';
import { ToastService } from '../../core/toast.service';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { ZonasService } from '../../core/zonas.service';
import {
  FechaHoraPipe,
  ImagenUrlPipe,
} from '../../shared/pipes';

@Component({
  selector: 'app-trabajos-disponibles',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FechaHoraPipe,
    ImagenUrlPipe,
  ],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Trabajador</span>
            <h1>Trabajos disponibles</h1>
            <p>
              Solicitudes de clientes en tus zonas. Envía una
              oferta con tu precio y disponibilidad.
            </p>
          </div>
          <a
            routerLink="/trabajador/mis-ofertas"
            class="btn btn--contorno"
            >Mis ofertas</a
          >
        </div>

        @if (perfil() && !perfil()?.puede_ofertar) {
          <div class="alerta alerta--aviso">
            <span>
              <strong>No puedes ofertar todavía.</strong>
              {{ perfil()?.motivo_bloqueo }}
              <a routerLink="/trabajador/verificacion"
                >Completar verificación</a
              >
            </span>
          </div>
        }

        <form
          class="tarjeta mb-2"
          [formGroup]="filtros"
          (ngSubmit)="buscar()"
        >
          <div class="formulario--rejilla">
            <div class="campo">
              <label class="etiqueta" for="zona">Zona</label>
              <select
                id="zona"
                class="select"
                formControlName="zona_id"
              >
                <option [value]="0">Todas mis zonas</option>
                @for (zona of zonas(); track zona.id) {
                  <option [value]="zona.id">
                    {{ zona.nombre }} · {{ zona.municipio }}
                  </option>
                }
              </select>
            </div>
            <div class="campo">
              <label class="etiqueta" for="especialidad"
                >Especialidad</label
              >
              <select
                id="especialidad"
                class="select"
                formControlName="especialidad"
              >
                <option value="">Todas</option>
                @for (
                  especialidad of especialidades;
                  track especialidad.valor
                ) {
                  <option [value]="especialidad.valor">
                    {{ especialidad.etiqueta }}
                  </option>
                }
              </select>
            </div>
          </div>
          <button
            type="submit"
            class="btn btn--primario mt-2"
            [disabled]="cargando()"
          >
            {{ cargando() ? 'Buscando…' : 'Actualizar lista' }}
          </button>
        </form>

        @if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        }

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Buscando trabajos…
          </div>
        } @else if (solicitudes().length === 0) {
          <div class="tarjeta">
            <div class="vacio">
              <div class="vacio__icono">0</div>
              <h3>No hay trabajos disponibles con esos filtros</h3>
              <p>
                Prueba con otra zona o especialidad, o vuelve más
                tarde.
              </p>
            </div>
          </div>
        } @else {
          <div class="pila">
            @for (
              solicitud of solicitudes();
              track solicitud.id
            ) {
              <div class="tarjeta">
                <div class="fila fila--arriba fila--separada">
                  <div>
                    <div class="fila">
                      <h2 style="margin:0">
                        {{ solicitud.tipo_problema }}
                      </h2>
                      @if (solicitud.urgente) {
                        <span class="insignia insignia--rojo"
                          >Urgente +10%</span
                        >
                      }
                      @if (solicitud.cliente_en_conflictivos) {
                        <span class="insignia insignia--ambar"
                          >Cliente con antecedentes</span
                        >
                      }
                    </div>
                    <p class="small muted" style="margin: 0.25rem 0 0">
                      {{
                        etiquetaEspecialidad(
                          solicitud.especialidad
                        )
                      }}
                      · {{ solicitud.zona?.nombre }} ·
                      {{
                        etiquetaEstado(solicitud.estado)
                      }}
                    </p>
                  </div>
                  <span class="small muted">
                    Publicada:
                    {{ solicitud.creada_en | fechaHora }}
                  </span>
                </div>

                <p class="mt-2">{{ solicitud.descripcion }}</p>

                @if (solicitud.fotos_urls.length) {
                  <div class="galeria mb-2">
                    @for (
                      foto of solicitud.fotos_urls;
                      track foto
                    ) {
                      <img
                        [src]="foto | imagenUrl"
                        alt="Foto del problema"
                      />
                    }
                  </div>
                }

                <div class="fila fila--separada">
                  <span class="small muted">
                    Cita preferida:
                    {{
                      solicitud.fecha_cita_preferida | fechaHora
                    }}
                  </span>
                  @if (ofertadas().includes(solicitud.id)) {
                    <span class="insignia insignia--verde"
                      >Oferta enviada</span
                    >
                  } @else {
                    <button
                      type="button"
                      class="btn btn--ambar btn--sm"
                      [disabled]="!perfil()?.puede_ofertar"
                      (click)="abrirOferta(solicitud)"
                    >
                      Enviar oferta
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>

    @if (seleccionada(); as solicitud) {
      <div class="modal-fondo" (click)="cerrarOferta()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="fila fila--separada">
            <h2 style="margin:0">Enviar oferta</h2>
            <button
              type="button"
              class="enlace-boton"
              (click)="cerrarOferta()"
            >
              Cerrar
            </button>
          </div>
          <p class="small muted">{{ solicitud.tipo_problema }}</p>

          @if (errorOferta()) {
            <div class="alerta alerta--error">
              <span>{{ errorOferta() }}</span>
            </div>
          }

          @if (solicitud.urgente) {
            <div class="alerta alerta--aviso">
              <span>
                Solicitud urgente: tendrá prioridad y el recargo
                del 10% se aplicará al precio acordado. Tu oferta
                se mantiene tal como la escribas.
              </span>
            </div>
          }

          <form
            class="formulario"
            [formGroup]="oferta"
            (ngSubmit)="enviarOferta()"
          >
            <div class="formulario--rejilla">
              <div class="campo">
                <label class="etiqueta" for="precio"
                  >Precio estimado (Bs)</label
                >
                <input
                  id="precio"
                  type="number"
                  class="input"
                  min="0.5"
                  step="0.5"
                  formControlName="precio_estimado"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="transporte"
                  >Costo de transporte (Bs)</label
                >
                <input
                  id="transporte"
                  type="number"
                  class="input"
                  min="0"
                  step="0.5"
                  formControlName="costo_transporte"
                />
              </div>
            </div>

            <div class="campo">
              <label class="etiqueta" for="fecha"
                >Fecha y hora propuesta</label
              >
              <input
                id="fecha"
                type="datetime-local"
                class="input"
                [min]="fechaMinima"
                formControlName="fecha_propuesta"
              />
            </div>

            <div class="campo">
              <label class="etiqueta" for="mensaje"
                >Mensaje <small>(opcional)</small></label
              >
              <textarea
                id="mensaje"
                class="textarea"
                formControlName="mensaje"
                maxlength="500"
                placeholder="Cuéntale al cliente cómo resolverás el problema."
              ></textarea>
            </div>

            @if (total() > 0) {
              <div class="alerta alerta--info">
                <span>
                  Total estimado:
                  <strong>Bs {{ total().toFixed(2) }}</strong>
                  (precio + transporte). El pago inicial del 25% se
                  calcula al confirmar.
                </span>
              </div>
            }

            <button
              type="submit"
              class="btn btn--primario btn--bloque"
              [disabled]="enviandoOferta()"
            >
              {{
                enviandoOferta()
                  ? 'Enviando…'
                  : 'Enviar mi oferta'
              }}
            </button>
          </form>
        </div>
      </div>
    }
  `,
})
export class TrabajosDisponibles implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly solicitudesService = inject(
    SolicitudesService,
  );
  private readonly trabajadoresService = inject(
    TrabajadoresService,
  );
  private readonly zonasService = inject(ZonasService);
  private readonly toast = inject(ToastService);

  protected readonly especialidades = ESPECIALIDADES;
  protected readonly etiquetaEspecialidad =
    etiquetaEspecialidad;
  protected readonly etiquetaEstado = etiquetaEstadoSolicitud;
  protected readonly fechaMinima = fechaMinimaLocal();

  protected readonly zonas = signal<Zona[]>([]);
  protected readonly solicitudes =
    signal<SolicitudDisponible[]>([]);
  protected readonly perfil =
    signal<PerfilTrabajadorPropio | null>(null);
  protected readonly ofertadas = signal<string[]>([]);
  protected readonly seleccionada =
    signal<SolicitudDisponible | null>(null);
  protected readonly cargando = signal(true);
  protected readonly enviandoOferta = signal(false);
  protected readonly error = signal('');
  protected readonly errorOferta = signal('');

  protected readonly filtros = this.fb.group({
    zona_id: [0],
    especialidad: [''],
  });

  protected readonly oferta = this.fb.group({
    precio_estimado: [
      0,
      [Validators.required, Validators.min(0.5)],
    ],
    costo_transporte: [0, [Validators.required, Validators.min(0)]],
    fecha_propuesta: ['', [Validators.required]],
    mensaje: [''],
  });

  protected readonly total = computed(() => {
    const valores = this.oferta.getRawValue();
    return (
      Number(valores.precio_estimado || 0) +
      Number(valores.costo_transporte || 0)
    );
  });

  ngOnInit(): void {
    void this.cargar();
  }

  protected async buscar(): Promise<void> {
    await this.cargarSolicitudes();
  }

  protected abrirOferta(solicitud: SolicitudDisponible): void {
    this.seleccionada.set(solicitud);
    this.errorOferta.set('');
    this.oferta.reset({
      precio_estimado: 0,
      costo_transporte: 0,
      fecha_propuesta: this.fechaMinima,
      mensaje: '',
    });
  }

  protected cerrarOferta(): void {
    this.seleccionada.set(null);
  }

  protected async enviarOferta(): Promise<void> {
    this.errorOferta.set('');
    const solicitud = this.seleccionada();
    if (!solicitud) {
      return;
    }
    if (this.oferta.invalid) {
      this.oferta.markAllAsTouched();
      this.errorOferta.set(
        'Completa el precio y la fecha propuesta.',
      );
      return;
    }
    const valores = this.oferta.getRawValue();
    this.enviandoOferta.set(true);
    try {
      await this.solicitudesService.ofertar(solicitud.id, {
        precio_estimado: Number(valores.precio_estimado),
        costo_transporte: Number(valores.costo_transporte),
        fecha_propuesta: new Date(
          valores.fecha_propuesta,
        ).toISOString(),
        mensaje: valores.mensaje.trim() || undefined,
      });
      this.ofertadas.update((ids) => [...ids, solicitud.id]);
      this.toast.exito('Oferta enviada al cliente.');
      this.cerrarOferta();
    } catch (error) {
      this.errorOferta.set(mensajeDeError(error));
    } finally {
      this.enviandoOferta.set(false);
    }
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.zonas.set(await this.zonasService.listar());
      this.perfil.set(
        await this.trabajadoresService
          .perfilPropio()
          .catch(() => null),
      );
      await this.cargarSolicitudes();
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarSolicitudes(): Promise<void> {
    const { zona_id, especialidad } =
      this.filtros.getRawValue();
    try {
      this.cargando.set(true);
      this.solicitudes.set(
        await this.solicitudesService.disponibles({
          zona_id: Number(zona_id) || null,
          especialidad: especialidad || null,
        }),
      );
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
