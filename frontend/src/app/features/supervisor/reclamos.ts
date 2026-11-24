import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { claseTonoReclamo, etiquetaEstadoReclamo } from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type { DecisionReclamo, ReclamoPublico } from '../../core/models';
import { ReputacionService } from '../../core/reputacion.service';
import { SupervisionService } from '../../core/supervision.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-reclamos-supervisor',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Supervisor</span>
            <h1>Bandeja de reclamos</h1>
            <p>Revisa y resuelve los reclamos abiertos. SLA: 72 horas.</p>
          </div>
          <a routerLink="/supervisor" class="btn btn--contorno">Volver al panel</a>
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando bandeja…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else {
          @if (reclamos().length === 0) {
            <div class="tarjeta centrado">
              <div class="vacio__icono">✓</div>
              <h2>No hay reclamos pendientes</h2>
              <p class="muted">Todos los reclamos han sido resueltos.</p>
            </div>
          } @else {
            <div class="pila">
              @for (reclamo of reclamos(); track reclamo.id) {
                <div class="tarjeta tarjeta--plana">
                  <div class="fila fila--separada">
                    <div>
                      <strong>Solicitud {{ reclamo.solicitud_id.slice(0, 8) }}…</strong>
                      <div class="small muted">
                        Abierto {{ reclamo.fecha_apertura }} ·
                        {{ reclamo.horas_para_responder ?? '—' }}h respuesta ·
                        {{ reclamo.horas_sla_supervisor ?? '—' }}h SLA
                      </div>
                      <p class="mt-1">{{ reclamo.motivo }}</p>
                      @if (reclamo.evidencia_fotos.length) {
                        <div class="galeria mt-1">
                          @for (foto of reclamo.evidencia_fotos; track foto) {
                            <img
                              [src]="foto"
                              alt="Evidencia"
                              style="width: 80px; height: 80px; object-fit: cover"
                            />
                          }
                        </div>
                      }
                      @if (reclamo.respuesta_trabajador) {
                        <div class="alerta alerta--info mt-1" style="margin:0">
                          <span>Respuesta del técnico: {{ reclamo.respuesta_trabajador }}</span>
                        </div>
                      }
                      @if (reclamo.resolucion_supervisor) {
                        <div class="alerta alerta--exito mt-1" style="margin:0">
                          <span>Resolución: {{ reclamo.resolucion_supervisor }}</span>
                        </div>
                      }
                    </div>
                    <span class="insignia" [class]="'insignia ' + claseTonoReclamo(reclamo.estado)">
                      {{ etiquetaEstadoReclamo(reclamo.estado) }}
                    </span>
                  </div>

                  @if (
                    reclamo.estado === 'ABIERTO' ||
                    reclamo.estado === 'RESPONDIDO' ||
                    reclamo.estado === 'EN_REVISION_SUPERVISOR'
                  ) {
                    <div class="campo mt-2">
                      <label class="etiqueta">Resolución (mín. 3 caracteres)</label>
                      <textarea
                        class="input"
                        rows="3"
                        [(ngModel)]="resoluciones[reclamo.id]"
                        placeholder="Escribe la decisión fundamentada…"
                      ></textarea>
                    </div>
                    <div class="fila mt-2" style="gap: 0.5rem">
                      <select
                        class="input"
                        [(ngModel)]="decisiones[reclamo.id]"
                        style="width: auto"
                      >
                        <option value="">Decisión</option>
                        <option value="FALTA_TRABAJADOR">
                          Falta del trabajador (aplica suspensión)
                        </option>
                        <option value="RECHAZADO">Rechazar reclamo</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      class="btn btn--primario btn--sm mt-2"
                      [disabled]="
                        resolviendo() === reclamo.id ||
                        !decisiones[reclamo.id] ||
                        !resoluciones[reclamo.id]?.trim()
                      "
                      (click)="resolver(reclamo)"
                    >
                      {{ resolviendo() === reclamo.id ? 'Resolviendo…' : 'Resolver' }}
                    </button>
                  } @else {
                    <span class="insignia insignia--verde mt-2">Resuelto</span>
                  }
                </div>
              }
            </div>
          }
        }

        @if (errorResolucion()) {
          <div class="alerta alerta--error mt-2">
            <span>{{ errorResolucion() }}</span>
          </div>
        }
      </div>
    </section>
  `,
})
export class ReclamosSupervisor implements OnInit {
  private readonly reputacionService = inject(ReputacionService);
  private readonly supervisionService = inject(SupervisionService);
  private readonly toast = inject(ToastService);

  protected readonly reclamos = signal<ReclamoPublico[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly etiquetaEstadoReclamo = etiquetaEstadoReclamo;
  protected readonly claseTonoReclamo = claseTonoReclamo;

  protected readonly resoluciones: Record<string, string> = {};
  protected readonly decisiones: Record<string, DecisionReclamo | ''> = {};
  protected readonly resolviendo = signal<string | null>(null);
  protected readonly errorResolucion = signal('');

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.reclamos.set(await this.reputacionService.bandejaReclamos());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async resolver(reclamo: ReclamoPublico): Promise<void> {
    const decision = this.decisiones[reclamo.id];
    const resolucion = this.resoluciones[reclamo.id]?.trim();
    if (!decision || !resolucion) return;

    this.resolviendo.set(reclamo.id);
    this.errorResolucion.set('');
    try {
      await this.reputacionService.resolverReclamo(reclamo.id, {
        decision,
        resolucion,
      });
      this.toast.exito('Reclamo resuelto correctamente.');
      const actualizados = this.reclamos().map((r) =>
        r.id === reclamo.id
          ? { ...r, estado: 'RESUELTO' as const, resolucion_supervisor: resolucion }
          : r,
      );
      this.reclamos.set(actualizados);
      this.decisiones[reclamo.id] = '';
      this.resoluciones[reclamo.id] = '';
    } catch (error) {
      this.errorResolucion.set(mensajeDeError(error));
    } finally {
      this.resolviendo.set(null);
    }
  }
}
