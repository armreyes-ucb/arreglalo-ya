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
  claseTonoReclamo,
  etiquetaEstadoReclamo,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type { ReclamoPublico } from '../../core/models';
import { ReputacionService } from '../../core/reputacion.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-reclamos-trabajador',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Trabajador</span>
            <h1>Mis reclamos asignados</h1>
            <p>
              Responde a los reclamos de tus clientes en un máximo de 48 horas.
            </p>
          </div>
          <a routerLink="/trabajador" class="btn btn--contorno"
            >Volver al panel</a
          >
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando reclamos…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else {
          @if (reclamos().length === 0) {
            <div class="tarjeta centrado">
              <div class="vacio__icono">✓</div>
              <h2>No tienes reclamos pendientes</h2>
              <p class="muted">
                Todos los trabajos se cerraron sin problemas.
              </p>
            </div>
          } @else {
            <div class="pila">
              @for (reclamo of reclamos(); track reclamo.id) {
                <div class="tarjeta tarjeta--plana">
                  <div class="fila fila--separada">
                    <div>
                      <strong>Solicitud {{ reclamo.solicitud_id.slice(0, 8) }}…</strong>
                      <div class="small muted">
                        Abierto {{ reclamo.fecha_apertura }}
                        · {{ reclamo.horas_para_responder ?? '—' }}h para responder
                      </div>
                      <p class="mt-1">{{ reclamo.motivo }}</p>
                      @if (reclamo.evidencia_fotos.length) {
                        <div class="galeria mt-1">
                          @for (foto of reclamo.evidencia_fotos; track foto) {
                            <img [src]="foto" alt="Evidencia" style="width: 80px; height: 80px; object-fit: cover" />
                          }
                        </div>
                      }
                    </div>
                    <span
                      class="insignia"
                      [class]="
                        'insignia ' + claseTonoReclamo(reclamo.estado)
                      "
                    >
                      {{ etiquetaEstadoReclamo(reclamo.estado) }}
                    </span>
                  </div>
                  @if (reclamo.respuesta_trabajador) {
                    <div class="alerta alerta--info mt-2" style="margin:0">
                      <span>Tu respuesta: {{ reclamo.respuesta_trabajador }}</span>
                    </div>
                  } @else if (
                    reclamo.estado === 'ABIERTO' ||
                    reclamo.estado === 'EN_REVISION_SUPERVISOR'
                  ) {
                    <div class="campo mt-2">
                      <label class="etiqueta" for="resp-{{ reclamo.id }}"
                        >Tu respuesta</label
                      >
                      <textarea
                        id="resp-{{ reclamo.id }}"
                        class="input"
                        rows="3"
                        [(ngModel)]="respuestas[reclamo.id]"
                        placeholder="Describe qué hiciste para resolver el problema…"
                      ></textarea>
                    </div>
                    <button
                      type="button"
                      class="btn btn--primario btn--sm mt-2"
                      [disabled]="respondiendo() === reclamo.id || !respuestas[reclamo.id]?.trim()"
                      (click)="responder(reclamo)"
                    >
                      {{ respondiendo() === reclamo.id ? 'Enviando…' : 'Responder' }}
                    </button>
                  } @else if (reclamo.estado === 'RESPONDIDO') {
                    <div class="alerta alerta--aviso mt-2" style="margin:0">
                      <span>En revisión por supervisor.</span>
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (errorRespuesta()) {
            <div class="alerta alerta--error mt-2">
              <span>{{ errorRespuesta() }}</span>
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class ReclamosTrabajador implements OnInit {
  private readonly reputacionService = inject(ReputacionService);
  private readonly toast = inject(ToastService);

  protected readonly reclamos = signal<ReclamoPublico[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly etiquetaEstadoReclamo = etiquetaEstadoReclamo;
  protected readonly claseTonoReclamo = claseTonoReclamo;

  protected readonly respuestas: Record<string, string> = {};
  protected readonly respondiendo = signal<string | null>(null);
  protected readonly errorRespuesta = signal('');

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.reclamos.set(await this.reputacionService.reclamosAsignados());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async responder(reclamo: ReclamoPublico): Promise<void> {
    const texto = this.respuestas[reclamo.id]?.trim();
    if (!texto) return;

    this.respondiendo.set(reclamo.id);
    this.errorRespuesta.set('');
    try {
      await this.reputacionService.responderReclamo(reclamo.id, {
        respuesta: texto,
      });
      this.toast.exito('Respuesta enviada. El supervisor revisará el caso.');
      const actualizados = this.reclamos().map((r) =>
        r.id === reclamo.id
          ? { ...r, respuesta_trabajador: texto, estado: 'RESPONDIDO' as const }
          : r,
      );
      this.reclamos.set(actualizados);
      this.respuestas[reclamo.id] = '';
    } catch (error) {
      this.errorRespuesta.set(mensajeDeError(error));
    } finally {
      this.respondiendo.set(null);
    }
  }
}