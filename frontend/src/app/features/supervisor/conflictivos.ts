import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/errores';
import type {
  ClienteConflictivoPublico,
  DecisionConflicto,
  DetalleConflictoPublico,
  EstadoClienteConflictivo,
} from '../../core/models';
import { SupervisionService } from '../../core/supervision.service';
import { ToastService } from '../../core/toast.service';
import { FechaHoraPipe } from '../../shared/pipes';

@Component({
  selector: 'app-conflictivos-supervisor',
  imports: [CommonModule, FormsModule, RouterLink, FechaHoraPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Supervisor</span>
            <h1>Clientes conflictivos</h1>
            <p>
              Detección por reclamos rechazados y cancelaciones reiteradas. Los casos quedan como
              potenciales hasta que un supervisor los confirme o desestime.
            </p>
          </div>
          <div class="rejilla mt-2">
            <a routerLink="/supervisor" class="btn btn--contorno">Volver al panel</a>
            <button
              type="button"
              class="btn btn--primario"
              [disabled]="ejecutandoDeteccion()"
              (click)="detectar()"
            >
              {{ ejecutandoDeteccion() ? 'Detectando…' : 'Ejecutar detección' }}
            </button>
          </div>
        </div>

        @if (errorDeteccion()) {
          <div class="alerta alerta--aviso mb-2">
            <span>{{ errorDeteccion() }}</span>
          </div>
        }

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
          <div class="rejilla rejilla--3 mb-2">
            <div class="tarjeta centrado">
              <span class="insignia insignia--ambar">POTENCIAL</span>
              <h2 class="mt-1">{{ resumen().potencial }}</h2>
              <p class="small muted">Pendientes de revisión</p>
            </div>
            <div class="tarjeta centrado">
              <span class="insignia insignia--rojo">CONFIRMADO</span>
              <h2 class="mt-1">{{ resumen().confirmado }}</h2>
              <p class="small muted">Clientes conflictivos</p>
            </div>
            <div class="tarjeta centrado">
              <span class="insignia insignia--neutro">DESESTIMADO</span>
              <h2 class="mt-1">{{ resumen().desestimado }}</h2>
              <p class="small muted">Casos descartados</p>
            </div>
          </div>

          <div class="tarjeta mb-2">
            <div class="tarjeta__cabecera">
              <h2>Bandeja de casos</h2>
              <div class="campo">
                <label class="etiqueta" for="estado_filtro">Filtrar por estado</label>
                <select
                  id="estado_filtro"
                  class="input"
                  [ngModel]="estadoFiltro()"
                  (ngModelChange)="estadoFiltro.set($event)"
                >
                  <option value="">Todos</option>
                  <option value="POTENCIAL">Potencial</option>
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="DESESTIMADO">Desestimado</option>
                </select>
              </div>
            </div>

            @if (filtrados().length === 0) {
              <div class="vacio">
                <div class="vacio__icono">✓</div>
                <p>
                  {{
                    conflictivos().length === 0
                      ? 'No hay clientes detectados con los criterios actuales.'
                      : 'No hay casos con el estado seleccionado.'
                  }}
                </p>
              </div>
            } @else {
              <div class="tabla-responsive mt-2">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Reclamos (total / rechazados)</th>
                      <th>Cancelaciones</th>
                      <th>Reportes</th>
                      <th>Estado</th>
                      <th>Actualizado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of filtrados(); track c.id) {
                      <tr>
                        <td>{{ c.cliente_id.slice(0, 8) }}…</td>
                        <td>
                          {{ c.reclamos_totales }} /
                          <span
                            class="insignia"
                            [class]="
                              c.reclamos_rechazados > 0 ? 'insignia--ambar' : 'insignia--neutro'
                            "
                          >
                            {{ c.reclamos_rechazados }}
                          </span>
                        </td>
                        <td>
                          <span
                            class="insignia"
                            [class]="
                              c.cancelaciones > 0 ? 'insignia--ambar' : 'insignia--neutro'
                            "
                          >
                            {{ c.cancelaciones }}
                          </span>
                        </td>
                        <td class="small">
                          {{ c.reportes_acumulados }} acumulados
                          <br />
                          {{ c.reportes_comprobados }} comprobados ·
                          {{ c.reportes_pendientes }} pendientes
                        </td>
                        <td>
                          <span class="insignia" [class]="claseEstado(c.estado)">
                            {{ c.estado }}
                          </span>
                        </td>
                        <td class="small">{{ c.actualizado_en | fechaHora }}</td>
                        <td>
                          <button
                            type="button"
                            class="btn btn--contorno btn--sm"
                            (click)="verDetalle(c.cliente_id)"
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          @if (cargandoDetalle()) {
            <div class="cargando">
              <span class="girador"></span>
              Cargando detalle…
            </div>
          } @else if (errorDetalle()) {
            <div class="alerta alerta--error mb-2">
              <span>{{ errorDetalle() }}</span>
            </div>
          } @else if (detalle(); as d) {
            <div class="tarjeta mb-2">
              <div class="tarjeta__cabecera">
                <h2>Detalle del caso</h2>
                <button type="button" class="btn btn--fantasma btn--sm" (click)="cerrarDetalle()">
                  Cerrar
                </button>
              </div>
              <p class="small muted">Cliente: {{ d.cliente_id }}</p>
              <p class="mt-1">
                Estado actual:
                <span class="insignia" [class]="claseEstado(d.estado)">{{ d.estado }}</span>
              </p>

              <h3 class="mt-3">Indicadores utilizados</h3>
              <div class="rejilla rejilla--3 mt-1">
                <div class="tarjeta tarjeta--plana">
                  <p class="small muted">Reclamos totales</p>
                  <strong>{{ d.indicadores.reclamos_totales }}</strong>
                </div>
                <div class="tarjeta tarjeta--plana">
                  <p class="small muted">Reclamos rechazados</p>
                  <strong>{{ d.indicadores.reclamos_rechazados }}</strong>
                </div>
                <div class="tarjeta tarjeta--plana">
                  <p class="small muted">Cancelaciones del cliente</p>
                  <strong>{{ d.indicadores.cancelaciones }}</strong>
                </div>
                <div class="tarjeta tarjeta--plana">
                  <p class="small muted">Reportes comprobados</p>
                  <strong>{{ d.indicadores.reportes_comprobados }}</strong>
                </div>
                <div class="tarjeta tarjeta--plana">
                  <p class="small muted">Reportes pendientes</p>
                  <strong>{{ d.indicadores.reportes_pendientes }}</strong>
                </div>
                <div class="tarjeta tarjeta--plana">
                  <p class="small muted">Periodo evaluado</p>
                  <strong>{{ d.indicadores.periodo_dias }} días</strong>
                </div>
              </div>

              <h3 class="mt-3">Motivos de detección</h3>
              @if (d.motivos.length === 0) {
                <p class="small muted">Sin motivos registrados.</p>
              } @else {
                <ul class="mt-1">
                  @for (motivo of d.motivos; track $index) {
                    <li class="small">{{ motivo }}</li>
                  }
                </ul>
              }

              <h3 class="mt-3">Reclamos del cliente</h3>
              @if (d.reclamos.length === 0) {
                <p class="small muted">No hay reclamos en el periodo.</p>
              } @else {
                <div class="tabla-responsive mt-1">
                  <table class="tabla">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Solicitud</th>
                        <th>Estado</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of d.reclamos; track r.id) {
                        <tr>
                          <td>{{ r.fecha | fechaHora }}</td>
                          <td class="small">{{ r.solicitud_id.slice(0, 8) }}…</td>
                          <td><span class="insignia insignia--neutro">{{ r.estado }}</span></td>
                          <td class="small">{{ r.motivo }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }

              <h3 class="mt-3">Cancelaciones del cliente</h3>
              @if (d.cancelaciones.length === 0) {
                <p class="small muted">No hay cancelaciones en el periodo.</p>
              } @else {
                <div class="tabla-responsive mt-1">
                  <table class="tabla">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Solicitud</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (c of d.cancelaciones; track c.solicitud_id) {
                        <tr>
                          <td>{{ c.fecha | fechaHora }}</td>
                          <td class="small">{{ c.solicitud_id.slice(0, 8) }}…</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }

              @if (d.estado === 'POTENCIAL') {
                <h3 class="mt-3">Registrar resolución</h3>
                <div class="formulario--rejilla mt-1">
                  <div class="campo">
                    <label class="etiqueta" for="decision">Decisión *</label>
                    <select id="decision" class="input" [(ngModel)]="decision">
                      <option value="CONFIRMAR">Confirmar cliente conflictivo</option>
                      <option value="DESESTIMAR">Desestimar caso</option>
                    </select>
                  </div>
                  <div class="campo campo--ancho">
                    <label class="etiqueta" for="justificacion">Justificación *</label>
                    <textarea
                      id="justificacion"
                      class="input"
                      rows="3"
                      maxlength="1000"
                      [(ngModel)]="justificacion"
                      placeholder="Explica la decisión (10 a 1000 caracteres)"
                    ></textarea>
                    <p class="small muted">{{ justificacion.length }} / 1000 caracteres</p>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn btn--primario mt-2"
                  [disabled]="!puedeResolver()"
                  (click)="resolver()"
                >
                  {{ resolviendo() ? 'Registrando…' : 'Registrar resolución' }}
                </button>
                @if (errorResolucion()) {
                  <div class="alerta alerta--error mt-2">
                    <span>{{ errorResolucion() }}</span>
                  </div>
                }
              }

              <h3 class="mt-3">Historial de resoluciones</h3>
              @if (d.resoluciones.length === 0) {
                <p class="small muted">El caso todavía no tiene resoluciones.</p>
              } @else {
                <div class="tabla-responsive mt-1">
                  <table class="tabla">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Decisión</th>
                        <th>Supervisor</th>
                        <th>Justificación</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (r of d.resoluciones; track r.id) {
                        <tr>
                          <td>{{ r.fecha | fechaHora }}</td>
                          <td>
                            <span class="insignia" [class]="claseEstado(r.decision)">
                              {{ r.decision }}
                            </span>
                          </td>
                          <td class="small">{{ r.supervisor_id.slice(0, 8) }}…</td>
                          <td class="small">{{ r.justificacion }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }

          <div class="tarjeta">
            <h2>Registrar cliente conflictivo</h2>
            <p class="small muted mt-1">
              Ingresa el ID del cliente y el motivo. Se sumará un reporte comprobado por el
              supervisor.
            </p>
            <div class="formulario--rejilla mt-2">
              <div class="campo">
                <label class="etiqueta" for="cliente_id">ID del cliente *</label>
                <input
                  id="cliente_id"
                  type="text"
                  class="input"
                  [(ngModel)]="nuevoConflictivo.cliente_id"
                  placeholder="UUID del usuario cliente"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="motivo">Motivo *</label>
                <textarea
                  id="motivo"
                  class="input"
                  rows="2"
                  [(ngModel)]="nuevoConflictivo.motivo"
                  placeholder="Describe el comportamiento reportado"
                ></textarea>
              </div>
            </div>
            <button
              type="button"
              class="btn btn--primario mt-2"
              [disabled]="
                registrando() || !nuevoConflictivo.cliente_id.trim() || !nuevoConflictivo.motivo.trim()
              "
              (click)="registrar()"
            >
              {{ registrando() ? 'Registrando…' : 'Registrar cliente conflictivo' }}
            </button>
            @if (errorRegistro()) {
              <div class="alerta alerta--error mt-2">
                <span>{{ errorRegistro() }}</span>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class ConflictivosSupervisor implements OnInit {
  private readonly supervisionService = inject(SupervisionService);
  private readonly toast = inject(ToastService);

  protected readonly conflictivos = signal<ClienteConflictivoPublico[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly ejecutandoDeteccion = signal(false);
  protected readonly errorDeteccion = signal('');
  protected readonly estadoFiltro = signal<EstadoClienteConflictivo | ''>('');

  protected readonly detalle = signal<DetalleConflictoPublico | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly errorDetalle = signal('');
  protected readonly resolviendo = signal(false);
  protected readonly errorResolucion = signal('');
  protected decision: DecisionConflicto = 'CONFIRMAR';
  protected justificacion = '';

  protected nuevoConflictivo = { cliente_id: '', motivo: '' };
  protected readonly registrando = signal(false);
  protected readonly errorRegistro = signal('');

  protected readonly resumen = computed(() => {
    const casos = this.conflictivos();
    return {
      potencial: casos.filter((caso) => caso.estado === 'POTENCIAL').length,
      confirmado: casos.filter((caso) => caso.estado === 'CONFIRMADO').length,
      desestimado: casos.filter((caso) => caso.estado === 'DESESTIMADO').length,
    };
  });

  protected readonly filtrados = computed(() => {
    const estado = this.estadoFiltro();
    const casos = this.conflictivos();
    return estado ? casos.filter((caso) => caso.estado === estado) : casos;
  });

  protected puedeResolver(): boolean {
    if (this.detalle()?.estado !== 'POTENCIAL' || this.resolviendo()) {
      return false;
    }
    const longitud = this.justificacion.trim().length;
    return longitud >= 10 && longitud <= 1000;
  }

  ngOnInit(): void {
    void this.iniciar();
  }

  protected claseEstado(estado: EstadoClienteConflictivo | DecisionConflicto): string {
    if (estado === 'CONFIRMADO' || estado === 'CONFIRMAR') {
      return 'insignia--rojo';
    }
    if (estado === 'DESESTIMADO' || estado === 'DESESTIMAR') {
      return 'insignia--neutro';
    }
    return 'insignia--ambar';
  }

  private async iniciar(): Promise<void> {
    this.cargando.set(true);
    this.errorDeteccion.set('');
    try {
      await this.supervisionService.detectarConflictivos();
    } catch (error) {
      // La bandeja igual se consulta; solo se avisa que la detección falló.
      this.errorDeteccion.set(mensajeDeError(error));
    }
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.conflictivos.set(await this.supervisionService.listarConflictivos());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async detectar(): Promise<void> {
    this.ejecutandoDeteccion.set(true);
    this.errorDeteccion.set('');
    try {
      const resumen = await this.supervisionService.detectarConflictivos();
      this.toast.exito(
        resumen.omitido
          ? 'La detección automática está desactivada.'
          : `Detección completada: ${resumen.potenciales} nuevos, ${resumen.actualizados} actualizados.`,
      );
      await this.cargar();
    } catch (error) {
      this.errorDeteccion.set(mensajeDeError(error));
    } finally {
      this.ejecutandoDeteccion.set(false);
    }
  }

  protected async verDetalle(clienteId: string): Promise<void> {
    this.cargandoDetalle.set(true);
    this.errorDetalle.set('');
    this.errorResolucion.set('');
    this.justificacion = '';
    this.decision = 'CONFIRMAR';
    try {
      this.detalle.set(await this.supervisionService.obtenerDetalleConflictivo(clienteId));
    } catch (error) {
      this.detalle.set(null);
      this.errorDetalle.set(mensajeDeError(error));
    } finally {
      this.cargandoDetalle.set(false);
    }
  }

  protected cerrarDetalle(): void {
    this.detalle.set(null);
    this.errorDetalle.set('');
    this.errorResolucion.set('');
  }

  protected async resolver(): Promise<void> {
    const detalle = this.detalle();
    if (!detalle) {
      return;
    }
    const justificacion = this.justificacion.trim();
    if (justificacion.length < 10 || justificacion.length > 1000) {
      this.errorResolucion.set(
        'La justificación debe tener entre 10 y 1000 caracteres.',
      );
      return;
    }

    this.resolviendo.set(true);
    this.errorResolucion.set('');
    try {
      await this.supervisionService.resolverConflictivo(detalle.cliente_id, {
        decision: this.decision,
        justificacion,
      });
      this.toast.exito(
        this.decision === 'CONFIRMAR'
          ? 'Caso confirmado como cliente conflictivo.'
          : 'Caso desestimado.',
      );
      this.justificacion = '';
      await this.cargar();
      await this.verDetalle(detalle.cliente_id);
    } catch (error) {
      this.errorResolucion.set(mensajeDeError(error));
    } finally {
      this.resolviendo.set(false);
    }
  }

  protected async registrar(): Promise<void> {
    this.errorRegistro.set('');
    this.registrando.set(true);
    try {
      await this.supervisionService.registrarConflictivo({
        cliente_id: this.nuevoConflictivo.cliente_id,
        motivo: this.nuevoConflictivo.motivo,
      });
      this.toast.exito('Cliente registrado como conflictivo.');
      this.nuevoConflictivo = { cliente_id: '', motivo: '' };
      await this.cargar();
    } catch (error) {
      this.errorRegistro.set(mensajeDeError(error));
    } finally {
      this.registrando.set(false);
    }
  }
}
