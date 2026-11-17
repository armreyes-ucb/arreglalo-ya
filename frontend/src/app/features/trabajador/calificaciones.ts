import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  claseTonoSolicitud,
  etiquetaEstadoSolicitud,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type {
  CalificacionPublica,
  ResumenReputacion,
} from '../../core/models';
import { ReputacionService } from '../../core/reputacion.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-calificaciones-trabajador',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Trabajador</span>
            <h1>Mis calificaciones</h1>
            <p>
              Revisa las valoraciones que has recibido y califica a tus clientes.
            </p>
          </div>
          <a routerLink="/trabajador" class="btn btn--contorno"
            >Volver al panel</a
          >
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando calificaciones…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else {
          <div class="tarjeta mb-2">
            <h2>Resumen de reputación</h2>
            <div class="rejilla rejilla--4 mt-2">
              <div class="estadistica">
                <span class="estadistica__texto">Promedio general</span>
                <span class="estadistica__valor">{{
                  resumen()?.promedio.toFixed(1) ?? '—'
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Trabajos calificados</span>
                <span class="estadistica__valor">{{
                  resumen()?.total_trabajos ?? 0
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Total calificaciones</span>
                <span class="estadistica__valor">{{
                  resumen()?.total_calificaciones ?? 0
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Calidad · Puntualidad</span>
                <span class="estadistica__valor small">{{
                  resumen()?.por_habilidad.calidad?.toFixed(1) ?? '—'
                }} · {{
                  resumen()?.por_habilidad.puntualidad?.toFixed(1) ?? '—'
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Trato · Precio justo</span>
                <span class="estadistica__valor small">{{
                  resumen()?.por_habilidad.trato?.toFixed(1) ?? '—'
                }} · {{
                  resumen()?.por_habilidad.precio_justo?.toFixed(1) ?? '—'
                }}</span>
              </div>
            </div>
          </div>

          <div class="tarjeta">
            <h2>Calificaciones recibidas</h2>
            @if (calificaciones().length === 0) {
              <div class="vacio">
                <div class="vacio__icono">★</div>
                <p>Aún no has recibido calificaciones.</p>
              </div>
            } @else {
              <div class="pila">
                @for (cal of calificaciones(); track cal.id) {
                  <div class="tarjeta tarjeta--plana">
                    <div class="fila fila--separada">
                      <div>
                        <strong>Solicitud {{ cal.solicitud_id.slice(0, 8) }}…</strong>
                        <div class="small muted">
                          {{ cal.fecha }} · {{ cal.estrellas }}/5
                        </div>
                        @if (cal.comentario) {
                          <p class="mt-1 small">{{ cal.comentario }}</p>
                        }
                        <div class="fila mt-1" style="gap: 1rem">
                          <span
                            class="chip"
                            [class.chip--activo]="cal.calidad !== null"
                          >
                            Calidad: {{ cal.calidad ?? '—' }}
                          </span>
                          <span
                            class="chip"
                            [class.chip--activo]="cal.puntualidad !== null"
                          >
                            Puntualidad: {{ cal.puntualidad ?? '—' }}
                          </span>
                          <span
                            class="chip"
                            [class.chip--activo]="cal.trato !== null"
                          >
                            Trato: {{ cal.trato ?? '—' }}
                          </span>
                          <span
                            class="chip"
                            [class.chip--activo]="cal.precio_justo !== null"
                          >
                            Precio: {{ cal.precio_justo ?? '—' }}
                          </span>
                        </div>
                      </div>
                      @if (cal.respuesta_trabajador) {
                        <div class="alerta alerta--info mt-2" style="margin:0">
                          <span
                            >Tu respuesta: {{ cal.respuesta_trabajador }}</span
                          >
                        </div>
                      } @else if (cal.comentario) {
                        <button
                          type="button"
                          class="btn btn--contorno btn--sm mt-2"
                          (click)="abrirRespuesta(cal)"
                        >
                          Responder
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <div class="tarjeta mt-2">
            <h2>Calificaciones que escribiste</h2>
            @if (escritas().length === 0) {
              <div class="vacio">
                <div class="vacio__icono">✏️</div>
                <p>No has calificado a ningún cliente todavía.</p>
              </div>
            } @else {
              <div class="pila">
                @for (cal of escritas(); track cal.id) {
                  <div class="tarjeta tarjeta--plana">
                    <div class="fila fila--separada">
                      <div>
                        <strong>Cliente {{ cal.destinatario_id.slice(0, 8) }}…</strong>
                        <div class="small muted">
                          {{ cal.fecha }} · {{ cal.estrellas }}/5
                        </div>
                        @if (cal.comentario) {
                          <p class="mt-1 small">{{ cal.comentario }}</p>
                        }
                      </div>
                      <span
                        class="insignia"
                        [class]="
                          'insignia ' + claseTono(cal.estrellas >= 4 ? 'FINALIZADA' : 'CANCELADA')
                        "
                      >
                        {{ cal.estrellas }}/5
                      </span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (mostrarRespuesta(); as cal) {
          <div class="modal-fondo" (click)="cerrarRespuesta()">
            <div
              class="modal"
              role="dialog"
              aria-modal="true"
              (click)="$event.stopPropagation()"
            >
              <div class="fila fila--separada">
                <h2 style="margin:0">Responder calificación</h2>
                <button
                  type="button"
                  class="enlace-boton"
                  (click)="cerrarRespuesta()"
                >
                  Cerrar
                </button>
              </div>
              <p class="small muted">
                Solicitud {{ cal.solicitud_id.slice(0, 8) }}… · {{
                  cal.estrellas }}
                /5
              </p>
              @if (cal.comentario) {
                <p class="mt-2 small">“{{ cal.comentario }}”</p>
              }
              <div class="campo mt-2">
                <label class="etiqueta" for="respuesta"
                  >Tu respuesta pública</label
                >
                <textarea
                  id="respuesta"
                  class="input"
                  rows="3"
                  [(ngModel)]="respuestaTexto"
                  placeholder="Escribe tu respuesta…"
                ></textarea>
              </div>
              <div class="fila mt-2" style="justify-content: flex-end">
                <button
                  type="button"
                  class="btn btn--contorno"
                  (click)="cerrarRespuesta()"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  class="btn btn--primario"
                  [disabled]="respondiendo() || !respuestaTexto().trim()"
                  (click)="enviarRespuesta()"
                >
                  {{ respondiendo() ? 'Enviando…' : 'Publicar respuesta' }}
                </button>
              </div>
              @if (errorRespuesta()) {
                <div class="alerta alerta--error mt-2">
                  <span>{{ errorRespuesta() }}</span>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class CalificacionesTrabajador implements OnInit {
  private readonly reputacionService = inject(ReputacionService);
  private readonly toast = inject(ToastService);

  protected readonly calificaciones = signal<CalificacionPublica[]>([]);
  protected readonly escritas = signal<CalificacionPublica[]>([]);
  protected readonly resumen = signal<ResumenReputacion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly etiquetaEstado = etiquetaEstadoSolicitud;
  protected readonly claseTono = claseTonoSolicitud;

  protected readonly mostrarRespuesta = signal<CalificacionPublica | null>(null);
  protected readonly respuestaTexto = signal('');
  protected readonly respondiendo = signal(false);
  protected readonly errorRespuesta = signal('');

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [recibidas, escritas, resumen] = await Promise.all([
        this.reputacionService.calificacionesRecibidas(),
        this.reputacionService.misCalificaciones(),
        this.reputacionService.reputacionTrabajador('').catch(() => null),
      ]);
      this.calificaciones.set(recibidas);
      this.escritas.set(escritas);
      this.resumen.set(resumen);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected abrirRespuesta(cal: CalificacionPublica): void {
    this.respuestaTexto.set('');
    this.errorRespuesta.set('');
    this.mostrarRespuesta.set(cal);
  }

  protected cerrarRespuesta(): void {
    if (!this.respondiendo()) {
      this.mostrarRespuesta.set(null);
    }
  }

  protected async enviarRespuesta(): Promise<void> {
    const cal = this.mostrarRespuesta();
    if (!cal || !this.respuestaTexto().trim()) return;

    this.respondiendo.set(true);
    this.errorRespuesta.set('');
    try {
      await this.reputacionService.responderCalificacion(cal.id, {
        respuesta: this.respuestaTexto().trim(),
      });
      this.toast.exito('Respuesta publicada correctamente.');
      this.cerrarRespuesta();
      const actualizadas = this.calificaciones().map((c) =>
        c.id === cal.id ? { ...c, respuesta_trabajador: this.respuestaTexto() } : c,
      );
      this.calificaciones.set(actualizadas);
    } catch (error) {
      this.errorRespuesta.set(mensajeDeError(error));
    } finally {
      this.respondiendo.set(false);
    }
  }
}