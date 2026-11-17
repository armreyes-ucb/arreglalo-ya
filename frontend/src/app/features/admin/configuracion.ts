import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mensajeDeError } from '../../core/errores';
import type { ConfiguracionPlataforma, CambioConfiguracion } from '../../core/models';
import { AdminService } from '../../core/admin.service';
import { ToastService } from '../../core/toast.service';
import { FechaPipe } from '../../shared/pipes';

@Component({
  selector: 'app-configuracion-admin',
  imports: [CommonModule, FormsModule, FechaPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Administración</span>
            <h1>Configuración de la plataforma</h1>
            <p>
              Porcentajes, plazos y reglas de negocio. Los cambios afectan solo a
              solicitudes nuevas (CP35).
            </p>
          </div>
          <a routerLink="/admin" class="btn btn--contorno"
            >Volver al panel</a
          >
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando configuración…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else if (config(); as cfg) {
          <div class="tarjeta mb-2">
            <h2>Parámetros actuales</h2>
            <div class="formulario--rejilla mt-2">
              <div class="campo">
                <label class="etiqueta" for="comision_pct"
                  >Comisión plataforma (%) *</label
                >
                <input
                  id="comision_pct"
                  type="number"
                  class="input"
                  step="0.01"
                  min="0"
                  max="100"
                  [(ngModel)]="comision_pct"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="pago_inicial_pct"
                  >Pago inicial por QR (%) *</label
                >
                <input
                  id="pago_inicial_pct"
                  type="number"
                  class="input"
                  step="0.01"
                  min="0.5"
                  max="100"
                  [(ngModel)]="pago_inicial_pct"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="factor_urgente"
                  >Factor urgente *</label
                >
                <input
                  id="factor_urgente"
                  type="number"
                  class="input"
                  step="0.01"
                  min="1"
                  max="5"
                  [(ngModel)]="factor_urgente"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="minutos_vigencia_qr"
                  >Vigencia QR (minutos) *</label
                >
                <input
                  id="minutos_vigencia_qr"
                  type="number"
                  class="input"
                  min="1"
                  max="1440"
                  [(ngModel)]="minutos_vigencia_qr"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="horas_cancelacion_sin_penalidad"
                  >Horas cancelación sin penalidad *</label
                >
                <input
                  id="horas_cancelacion_sin_penalidad"
                  type="number"
                  class="input"
                  min="0"
                  max="168"
                  [(ngModel)]="horas_cancelacion_sin_penalidad"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="dias_habiles_devolucion"
                  >Días hábiles devolución *</label
                >
                <input
                  id="dias_habiles_devolucion"
                  type="number"
                  class="input"
                  min="0"
                  max="30"
                  [(ngModel)]="dias_habiles_devolucion"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="horas_cierre_automatico"
                  >Horas cierre automático *</label
                >
                <input
                  id="horas_cierre_automatico"
                  type="number"
                  class="input"
                  min="1"
                  max="720"
                  [(ngModel)]="horas_cierre_automatico"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="dias_caducidad_solicitud"
                  >Días caducidad solicitud *</label
                >
                <input
                  id="dias_caducidad_solicitud"
                  type="number"
                  class="input"
                  min="1"
                  max="365"
                  [(ngModel)]="dias_caducidad_solicitud"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="dias_tope_urgente"
                  >Días tope urgente *</label
                >
                <input
                  id="dias_tope_urgente"
                  type="number"
                  class="input"
                  min="1"
                  max="365"
                  [(ngModel)]="dias_tope_urgente"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="dias_pausa_maxima"
                  >Días pausa máxima *</label
                >
                <input
                  id="dias_pausa_maxima"
                  type="number"
                  class="input"
                  min="1"
                  max="365"
                  [(ngModel)]="dias_pausa_maxima"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="dias_pausa_baja"
                  >Días pausa → baja *</label
                >
                <input
                  id="dias_pausa_baja"
                  type="number"
                  class="input"
                  min="1"
                  max="365"
                  [(ngModel)]="dias_pausa_baja"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="dias_aviso_antecedentes"
                  >Días aviso antecedentes *</label
                >
                <input
                  id="dias_aviso_antecedentes"
                  type="number"
                  class="input"
                  min="0"
                  max="365"
                  [(ngModel)]="dias_aviso_antecedentes"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="dias_reclamo"
                  >Días para reclamar *</label
                >
                <input
                  id="dias_reclamo"
                  type="number"
                  class="input"
                  min="0"
                  max="365"
                  [(ngModel)]="dias_reclamo"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="horas_respuesta_reclamo"
                  >Horas respuesta reclamo *</label
                >
                <input
                  id="horas_respuesta_reclamo"
                  type="number"
                  class="input"
                  min="1"
                  max="720"
                  [(ngModel)]="horas_respuesta_reclamo"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="horas_sla_supervisor"
                  >Horas SLA supervisor *</label
                >
                <input
                  id="horas_sla_supervisor"
                  type="number"
                  class="input"
                  min="1"
                  max="720"
                  [(ngModel)]="horas_sla_supervisor"
                />
              </div>
            </div>
            <button
              type="button"
              class="btn btn--primario mt-2"
              [disabled]="guardando()"
              (click)="guardar()"
            >
              {{ guardando() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
            @if (errorGuardado()) {
              <div class="alerta alerta--error mt-2">
                <span>{{ errorGuardado() }}</span>
              </div>
            }
          </div>

          <div class="tarjeta">
            <h2>Historial de cambios</h2>
            @if (historial().length === 0) {
              <div class="vacio">
                <div class="vacio__icono">📋</div>
                <p>No hay cambios registrados aún.</p>
              </div>
            } @else {
              <div class="tabla-responsive mt-2">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th>Campo</th>
                      <th>Valor anterior</th>
                      <th>Valor nuevo</th>
                      <th>Usuario</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of historial(); track c.id) {
                      <tr>
                        <td>{{ c.campo }}</td>
                        <td>{{ c.valor_anterior ?? '—' }}</td>
                        <td>{{ c.valor_nuevo }}</td>
                        <td>{{ c.usuario_id.slice(0, 8) }}…</td>
                        <td>{{ c.fecha | fecha }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class ConfiguracionAdmin implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly config = signal<ConfiguracionPlataforma | null>(null);
  protected readonly historial = signal<CambioConfiguracion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly guardando = signal(false);
  protected readonly errorGuardado = signal('');

  protected comision_pct = 5;
  protected pago_inicial_pct = 25;
  protected factor_urgente = 1.1;
  protected minutos_vigencia_qr = 30;
  protected horas_cancelacion_sin_penalidad = 2;
  protected dias_habiles_devolucion = 3;
  protected horas_cierre_automatico = 48;
  protected dias_caducidad_solicitud = 30;
  protected dias_tope_urgente = 3;
  protected dias_pausa_maxima = 30;
  protected dias_pausa_baja = 60;
  protected dias_aviso_antecedentes = 15;
  protected dias_reclamo = 7;
  protected horas_respuesta_reclamo = 48;
  protected horas_sla_supervisor = 72;

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [cfg, hist] = await Promise.all([
        this.adminService.obtenerConfiguracion(),
        this.adminService.historialConfiguracion(),
      ]);
      this.config.set(cfg);
      this.historial.set(hist);
      this.comision_pct = cfg.comision_pct;
      this.pago_inicial_pct = cfg.pago_inicial_pct;
      this.factor_urgente = cfg.factor_urgente;
      this.minutos_vigencia_qr = cfg.minutos_vigencia_qr;
      this.horas_cancelacion_sin_penalidad = cfg.horas_cancelacion_sin_penalidad;
      this.dias_habiles_devolucion = cfg.dias_habiles_devolucion;
      this.horas_cierre_automatico = cfg.horas_cierre_automatico;
      this.dias_caducidad_solicitud = cfg.dias_caducidad_solicitud;
      this.dias_tope_urgente = cfg.dias_tope_urgente;
      this.dias_pausa_maxima = cfg.dias_pausa_maxima;
      this.dias_pausa_baja = cfg.dias_pausa_baja;
      this.dias_aviso_antecedentes = cfg.dias_aviso_antecedentes;
      this.dias_reclamo = cfg.dias_reclamo;
      this.horas_respuesta_reclamo = cfg.horas_respuesta_reclamo;
      this.horas_sla_supervisor = cfg.horas_sla_supervisor;
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async guardar(): Promise<void> {
    this.guardando.set(true);
    this.errorGuardado.set('');
    try {
      const nuevo = await this.adminService.actualizarConfiguracion({
        comision_pct: this.comision_pct,
        pago_inicial_pct: this.pago_inicial_pct,
        factor_urgente: this.factor_urgente,
        minutos_vigencia_qr: this.minutos_vigencia_qr,
        horas_cancelacion_sin_penalidad: this.horas_cancelacion_sin_penalidad,
        dias_habiles_devolucion: this.dias_habiles_devolucion,
        horas_cierre_automatico: this.horas_cierre_automatico,
        dias_caducidad_solicitud: this.dias_caducidad_solicitud,
        dias_tope_urgente: this.dias_tope_urgente,
        dias_pausa_maxima: this.dias_pausa_maxima,
        dias_pausa_baja: this.dias_pausa_baja,
        dias_aviso_antecedentes: this.dias_aviso_antecedentes,
        dias_reclamo: this.dias_reclamo,
        horas_respuesta_reclamo: this.horas_respuesta_reclamo,
        horas_sla_supervisor: this.horas_sla_supervisor,
      } as Partial<ConfiguracionPlataforma>);
      this.config.set(nuevo);
      this.comision_pct = nuevo.comision_pct;
      this.pago_inicial_pct = nuevo.pago_inicial_pct;
      this.factor_urgente = nuevo.factor_urgente;
      this.minutos_vigencia_qr = nuevo.minutos_vigencia_qr;
      this.horas_cancelacion_sin_penalidad = nuevo.horas_cancelacion_sin_penalidad;
      this.dias_habiles_devolucion = nuevo.dias_habiles_devolucion;
      this.horas_cierre_automatico = nuevo.horas_cierre_automatico;
      this.dias_caducidad_solicitud = nuevo.dias_caducidad_solicitud;
      this.dias_tope_urgente = nuevo.dias_tope_urgente;
      this.dias_pausa_maxima = nuevo.dias_pausa_maxima;
      this.dias_pausa_baja = nuevo.dias_pausa_baja;
      this.dias_aviso_antecedentes = nuevo.dias_aviso_antecedentes;
      this.dias_reclamo = nuevo.dias_reclamo;
      this.horas_respuesta_reclamo = nuevo.horas_respuesta_reclamo;
      this.horas_sla_supervisor = nuevo.horas_sla_supervisor;
      this.toast.exito('Configuración actualizada correctamente.');
    } catch (error) {
      this.errorGuardado.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }
}