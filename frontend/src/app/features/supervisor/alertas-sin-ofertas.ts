import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/errores';
import { fechaMinimaLocal, formatearFechaHora, valorDatetimeLocal } from '../../core/formato';
import type { AlertaSinOfertas } from '../../core/models';
import { SupervisionService } from '../../core/supervision.service';
import { ToastService } from '../../core/toast.service';
import { FechaHoraPipe } from '../../shared/pipes';

@Component({
  selector: 'app-alertas-sin-ofertas-supervisor',
  imports: [FormsModule, RouterLink, FechaHoraPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Supervisor</span>
            <h1>Solicitudes sin ofertas</h1>
            <p>
              El sistema alerta cuando una solicitud abierta lleva
              {{ minutosConfigurados() }} minutos sin recibir propuestas. Puedes ampliar el plazo
              para que siga visible.
            </p>
          </div>
          <a routerLink="/supervisor" class="btn btn--contorno">Volver al panel</a>
        </div>

        @if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        }

        <div class="rejilla rejilla--3 seccion">
          <div class="tarjeta">
            <span class="estadistica__texto">Alertas activas</span>
            <span class="estadistica__valor">{{ alertas().length }}</span>
            <span class="small muted">Solicitudes abiertas sin propuestas</span>
          </div>
          <div class="tarjeta">
            <span class="estadistica__texto">Periodo configurado</span>
            <span class="estadistica__valor">{{ minutosConfigurados() }}</span>
            <span class="small muted">minutos sin ofertas</span>
          </div>
          <div class="tarjeta">
            <span class="estadistica__texto">Mayor espera</span>
            <span class="estadistica__valor">{{ mayorEspera() }}</span>
            <span class="small muted">minutos sin propuestas</span>
          </div>
        </div>

        <div class="tarjeta">
          <div class="tarjeta__cabecera">
            <h2>Panel de alertas</h2>
            <button
              type="button"
              class="btn btn--contorno btn--sm"
              [disabled]="cargando()"
              (click)="cargar()"
            >
              {{ cargando() ? 'Actualizando…' : 'Actualizar' }}
            </button>
          </div>

          @if (cargando()) {
            <div class="cargando">
              <span class="girador"></span>
              Buscando solicitudes sin ofertas…
            </div>
          } @else if (alertas().length === 0) {
            <div class="vacio">
              <div class="vacio__icono">✓</div>
              <p>No hay solicitudes abiertas sin ofertas en este momento.</p>
            </div>
          } @else {
            <div class="tabla-responsive mt-2">
              <table class="tabla">
                <thead>
                  <tr>
                    <th>Solicitud</th>
                    <th>Zona</th>
                    <th>Alerta generada</th>
                    <th>Sin ofertas</th>
                    <th>Vence</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (alerta of alertas(); track alerta.id) {
                    <tr>
                      <td>
                        <strong>{{ alerta.tipo_problema }}</strong>
                        <div class="small muted">
                          {{ alerta.especialidad }} · {{ alerta.solicitud_id.slice(0, 8) }}…
                        </div>
                      </td>
                      <td>{{ alerta.zona?.nombre ?? 'Sin zona' }}</td>
                      <td>{{ alerta.creada_en | fechaHora }}</td>
                      <td>{{ alerta.minutos_en_espera }} min</td>
                      <td>{{ alerta.vence_en_actual | fechaHora }}</td>
                      <td>
                        <button
                          type="button"
                          class="btn btn--ambar btn--sm"
                          (click)="abrirAmpliar(alerta)"
                        >
                          Ampliar plazo
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        @if (seleccionada(); as alerta) {
          <div class="modal-fondo" (click)="cerrarModal()">
            <div class="modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
              <div class="fila fila--separada">
                <h2 style="margin:0">Ampliar plazo</h2>
                <button type="button" class="enlace-boton" (click)="cerrarModal()">Cerrar</button>
              </div>

              <p class="small muted mt-2">
                {{ alerta.tipo_problema }} · {{ alerta.zona?.nombre ?? 'Sin zona' }}. El plazo
                actual vence el {{ alerta.vence_en_actual | fechaHora }}.
              </p>

              <div class="campo mt-2">
                <label class="etiqueta" for="nueva-fecha">Nueva fecha y hora límite *</label>
                <input
                  id="nueva-fecha"
                  type="datetime-local"
                  class="input"
                  [(ngModel)]="nuevaFecha"
                  [min]="fechaMinima"
                />
                <p class="small muted">
                  Debe ser posterior a la fecha actual y al plazo vigente.
                </p>
              </div>

              @if (errorModal()) {
                <div class="alerta alerta--error mt-2">
                  <span>{{ errorModal() }}</span>
                </div>
              }

              <div class="fila mt-2" style="justify-content:flex-end">
                <button type="button" class="btn btn--fantasma" (click)="cerrarModal()">
                  Cancelar
                </button>
                <button
                  type="button"
                  class="btn btn--primario"
                  [disabled]="guardando()"
                  (click)="ampliar()"
                >
                  {{ guardando() ? 'Guardando…' : 'Ampliar plazo' }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class AlertasSinOfertasSupervisor implements OnInit {
  private readonly supervisionService = inject(SupervisionService);
  private readonly toast = inject(ToastService);

  protected readonly alertas = signal<AlertaSinOfertas[]>([]);
  protected readonly minutosConfigurados = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly seleccionada = signal<AlertaSinOfertas | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorModal = signal('');
  protected readonly fechaMinima = fechaMinimaLocal();

  protected readonly mayorEspera = computed(() =>
    this.alertas().reduce(
      (mayor, alerta) => Math.max(mayor, alerta.minutos_en_espera),
      0,
    ),
  );

  protected nuevaFecha = '';

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const listado = await this.supervisionService.listarAlertasSinOfertas();
      this.alertas.set(listado.alertas);
      this.minutosConfigurados.set(listado.minutos_sin_ofertas);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected abrirAmpliar(alerta: AlertaSinOfertas): void {
    this.seleccionada.set(alerta);
    this.errorModal.set('');
    const venceActual = new Date(alerta.vence_en_actual).getTime();
    const sugerida = new Date(
      Math.max(venceActual + 24 * 60 * 60 * 1000, Date.now() + 24 * 60 * 60 * 1000),
    );
    this.nuevaFecha = valorDatetimeLocal(sugerida);
  }

  protected cerrarModal(): void {
    this.seleccionada.set(null);
    this.errorModal.set('');
  }

  protected async ampliar(): Promise<void> {
    const alerta = this.seleccionada();
    if (!alerta) {
      return;
    }
    if (!this.nuevaFecha) {
      this.errorModal.set('Selecciona la nueva fecha límite.');
      return;
    }

    const nuevaFecha = new Date(this.nuevaFecha);
    if (Number.isNaN(nuevaFecha.getTime())) {
      this.errorModal.set('La nueva fecha límite no es válida.');
      return;
    }
    if (nuevaFecha.getTime() <= Date.now()) {
      this.errorModal.set('La nueva fecha debe ser posterior a la fecha actual.');
      return;
    }
    if (nuevaFecha.getTime() <= new Date(alerta.vence_en_actual).getTime()) {
      this.errorModal.set('La nueva fecha debe ser posterior al plazo actual.');
      return;
    }

    this.guardando.set(true);
    this.errorModal.set('');
    try {
      const resultado = await this.supervisionService.ampliarPlazo(
        alerta.solicitud_id,
        nuevaFecha.toISOString(),
      );
      this.toast.exito(
        `Plazo ampliado hasta ${formatearFechaHora(resultado.vence_en_nueva)}.`,
      );
      this.cerrarModal();
      await this.cargar();
    } catch (error) {
      this.errorModal.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}
