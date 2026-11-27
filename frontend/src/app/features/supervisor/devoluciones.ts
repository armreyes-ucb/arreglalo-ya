import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mensajeDeError } from '../../core/errores';
import type { DevolucionConSaldo, PagoConSaldo } from '../../core/models';
import { SupervisionService } from '../../core/supervision.service';
import { ToastService } from '../../core/toast.service';
import { FechaPipe } from '../../shared/pipes';
import { MonedaPipe } from '../../shared/pipes';

@Component({
  selector: 'app-devoluciones-supervisor',
  imports: [CommonModule, FormsModule, FechaPipe, MonedaPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Supervisor</span>
            <h1>Devoluciones</h1>
            <p>
              Registra devoluciones parciales del pago inicial (25%). El acumulado nunca puede
              superar el importe original del pago. RN04: máximo 3 días hábiles.
            </p>
          </div>
          <a routerLink="/supervisor" class="btn btn--contorno">Volver al panel</a>
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando devoluciones…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else {
          <div class="tarjeta mb-2">
            <h2>Registrar devolución parcial</h2>
            <p class="small muted mt-1">
              Solo se muestran pagos confirmados con saldo disponible. El monto se descuenta del
              saldo y no puede superarlo.
            </p>

            @if (pagosConSaldo().length === 0) {
              <div class="alerta alerta--info mt-2" style="margin:0">
                <span>No hay pagos confirmados con saldo reembolsable.</span>
              </div>
            } @else {
              <div class="formulario--rejilla mt-2">
                <div class="campo campo--ancho">
                  <label class="etiqueta" for="pago_id">Pago *</label>
                  <select
                    id="pago_id"
                    class="select"
                    [(ngModel)]="nuevaDevolucion.pago_id"
                    (ngModelChange)="alCambiarPago()"
                  >
                    <option value="">Selecciona un pago…</option>
                    @for (p of pagosConSaldo(); track p.pago_id) {
                      <option [value]="p.pago_id">
                        {{ p.pago_id.slice(0, 8) }}… · saldo {{ p.saldo_disponible | moneda }}
                      </option>
                    }
                  </select>
                </div>
                <div class="campo">
                  <label class="etiqueta" for="monto">Monto *</label>
                  <input
                    id="monto"
                    type="number"
                    class="input"
                    min="0.01"
                    step="0.01"
                    [max]="pagoSeleccionado()?.saldo_disponible ?? null"
                    [(ngModel)]="nuevaDevolucion.monto"
                    placeholder="0.00"
                  />
                </div>
                <div class="campo campo--ancho">
                  <label class="etiqueta" for="motivo">Motivo *</label>
                  <textarea
                    id="motivo"
                    class="input"
                    rows="2"
                    [(ngModel)]="nuevaDevolucion.motivo"
                    placeholder="Describe el motivo de la devolución parcial"
                  ></textarea>
                </div>
              </div>

              @if (pagoSeleccionado(); as pago) {
                <div class="resumen-saldo mt-2">
                  <div class="resumen-saldo__item">
                    <span class="small muted">Importe original</span>
                    <strong>{{ pago.monto_original | moneda }}</strong>
                  </div>
                  <div class="resumen-saldo__item">
                    <span class="small muted">Acumulado devuelto</span>
                    <strong>{{ pago.total_devuelto | moneda }}</strong>
                  </div>
                  <div class="resumen-saldo__item">
                    <span class="small muted">Saldo disponible</span>
                    <strong>{{ pago.saldo_disponible | moneda }}</strong>
                  </div>
                </div>
              }

              @if (errorRegistro()) {
                <div class="alerta alerta--error mt-2">
                  <span>{{ errorRegistro() }}</span>
                </div>
              }

              <button
                type="button"
                class="btn btn--primario mt-2"
                [disabled]="!puedeRegistrar()"
                (click)="registrar()"
              >
                {{ registrando() ? 'Registrando…' : 'Registrar devolución' }}
              </button>
            }
          </div>

          @if (devoluciones().length === 0) {
            <div class="tarjeta centrado">
              <div class="vacio__icono">↩️</div>
              <h2>No hay devoluciones registradas</h2>
              <p class="muted">Todas las solicitudes se cerraron sin devoluciones.</p>
            </div>
          } @else {
            <div class="tarjeta">
              <h2>Historial de devoluciones</h2>
              <div class="tabla-responsive mt-2">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th>Pago</th>
                      <th>Motivo</th>
                      <th>Monto devuelto</th>
                      <th>Original</th>
                      <th>Acumulado</th>
                      <th>Saldo</th>
                      <th>Fecha límite</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of devoluciones(); track d.id) {
                      <tr>
                        <td>{{ d.pago_id.slice(0, 8) }}…</td>
                        <td class="small">{{ d.motivo }}</td>
                        <td>{{ d.monto | moneda }}</td>
                        <td>{{ d.monto_original | moneda }}</td>
                        <td>{{ d.total_devuelto | moneda }}</td>
                        <td>{{ d.saldo_disponible | moneda }}</td>
                        <td>{{ d.fecha_limite | fecha }}</td>
                        <td>
                          <span
                            class="insignia"
                            [class]="
                              'insignia ' +
                              (d.estado === 'COMPLETADA'
                                ? 'insignia--verde'
                                : d.estado === 'EN_PROCESO'
                                  ? 'insignia--ambar'
                                  : 'insignia--neutro')
                            "
                          >
                            {{ d.estado }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class DevolucionesSupervisor implements OnInit {
  private readonly supervisionService = inject(SupervisionService);
  private readonly toast = inject(ToastService);

  protected readonly devoluciones = signal<DevolucionConSaldo[]>([]);
  protected readonly pagos = signal<PagoConSaldo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly registrando = signal(false);
  protected readonly errorRegistro = signal('');

  protected nuevaDevolucion: {
    pago_id: string;
    monto: number | null;
    motivo: string;
  } = { pago_id: '', monto: null, motivo: '' };

  protected readonly pagosConSaldo = computed(() =>
    this.pagos().filter((pago) => pago.saldo_disponible > 0),
  );

  protected pagoSeleccionado(): PagoConSaldo | null {
    return this.pagos().find((pago) => pago.pago_id === this.nuevaDevolucion.pago_id) ?? null;
  }

  protected puedeRegistrar(): boolean {
    const pago = this.pagoSeleccionado();
    const monto = Number(this.nuevaDevolucion.monto);
    return (
      !this.registrando() &&
      !!pago &&
      Number.isFinite(monto) &&
      monto > 0 &&
      monto <= pago.saldo_disponible &&
      this.nuevaDevolucion.motivo.trim().length >= 3
    );
  }

  ngOnInit(): void {
    void this.cargar();
  }

  protected alCambiarPago(): void {
    this.nuevaDevolucion.monto = null;
    this.errorRegistro.set('');
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [devoluciones, pagos] = await Promise.all([
        this.supervisionService.listarDevoluciones(),
        this.supervisionService.listarPagosConSaldo(),
      ]);
      this.devoluciones.set(devoluciones);
      this.pagos.set(pagos);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async registrar(): Promise<void> {
    const pago = this.pagoSeleccionado();
    if (!pago || !this.puedeRegistrar()) {
      return;
    }

    this.errorRegistro.set('');
    this.registrando.set(true);
    try {
      await this.supervisionService.registrarDevolucion({
        pago_id: pago.pago_id,
        monto: Number(this.nuevaDevolucion.monto),
        motivo: this.nuevaDevolucion.motivo.trim(),
      });
      this.toast.exito('Devolución parcial registrada.');
      this.nuevaDevolucion = { pago_id: '', monto: null, motivo: '' };
      await this.cargar();
    } catch (error) {
      this.errorRegistro.set(mensajeDeError(error));
    } finally {
      this.registrando.set(false);
    }
  }
}
