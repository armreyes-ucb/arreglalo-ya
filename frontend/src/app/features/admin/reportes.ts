import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mensajeDeError } from '../../core/errores';
import type {
  ReporteAdministrativo,
  ReporteSolicitudes,
  ReporteComisiones,
  ReporteDevoluciones,
  ReporteReclamos,
  EstadoSolicitud,
  EstadoDevolucion,
  EstadoReclamo,
} from '../../core/models';
import { AdminService } from '../../core/admin.service';
import { ToastService } from '../../core/toast.service';
import { FechaPipe } from '../../shared/pipes';
import { MonedaPipe } from '../../shared/pipes';

@Component({
  selector: 'app-reportes-admin',
  imports: [CommonModule, FormsModule, FechaPipe, MonedaPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Administración</span>
            <h1>Reportes financieros</h1>
            <p>
              Genera reportes de solicitudes, comisiones, devoluciones y
              reclamos filtrados por rango de fechas.
            </p>
          </div>
          <a routerLink="/admin" class="btn btn--contorno"
            >Volver al panel</a
          >
        </div>

        <div class="tarjeta mb-2">
          <h2>Filtro de fechas</h2>
          <div class="formulario--rejilla mt-2">
            <div class="campo">
              <label class="etiqueta" for="desde">Desde</label>
              <input
                id="desde"
                type="date"
                class="input"
                [(ngModel)]="filtro.desde"
              />
            </div>
            <div class="campo">
              <label class="etiqueta" for="hasta">Hasta</label>
              <input
                id="hasta"
                type="date"
                class="input"
                [(ngModel)]="filtro.hasta"
              />
            </div>
          </div>
          <button
            type="button"
            class="btn btn--primario mt-2"
            [disabled]="cargandoReporte()"
            (click)="generar()"
          >
            {{ cargandoReporte() ? 'Generando…' : 'Generar reporte' }}
          </button>
        </div>

        @if (cargandoReporte()) {
          <div class="cargando">
            <span class="girador"></span>
            Generando reporte…
          </div>
        } @else if (reporte(); as r) {
          <div class="tarjeta mb-2">
            <h2>Solicitudes</h2>
            <div class="rejilla rejilla--4 mt-2">
              <div class="estadistica">
                <span class="estadistica__texto">Total</span>
                <span class="estadistica__valor">{{ r.solicitudes.total }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Urgentes</span>
                <span class="estadistica__valor">{{ r.solicitudes.urgentes }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Con trabajador</span>
                <span class="estadistica__valor">{{
                  r.solicitudes.con_trabajador
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Sin trabajador</span>
                <span class="estadistica__valor">{{
                  r.solicitudes.sin_trabajador
                }}</span>
              </div>
            </div>
            <div class="mt-2 small muted">
              Por estado:
              @for (estado of estadosSolicitud(); track estado) {
                @if (r.solicitudes.por_estado[estado] !== undefined) {
                  <span class="chip"
                    >{{ estado }}: {{ r.solicitudes.por_estado[estado] }}</span
                  >
                }
              }
            </div>
          </div>

          <div class="tarjeta mb-2">
            <h2>Comisiones</h2>
            <div class="rejilla rejilla--4 mt-2">
              <div class="estadistica">
                <span class="estadistica__texto">Comisión cobrada</span>
                <span class="estadistica__valor">{{
                  r.comisiones.comision_cobrada | moneda
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Comisión devengada</span>
                <span class="estadistica__valor">{{
                  r.comisiones.comision_devengada | moneda
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Pagos confirmados</span>
                <span class="estadistica__valor">{{
                  r.comisiones.pagos_confirmados
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Monto total acordado</span>
                <span class="estadistica__valor">{{
                  r.comisiones.monto_total_acordado | moneda
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Pago inicial total</span>
                <span class="estadistica__valor">{{
                  r.comisiones.pago_inicial_total | moneda
                }}</span>
              </div>
            </div>
          </div>

          <div class="tarjeta mb-2">
            <h2>Devoluciones</h2>
            <div class="rejilla rejilla--4 mt-2">
              <div class="estadistica">
                <span class="estadistica__texto">Total</span>
                <span class="estadistica__valor">{{
                  r.devoluciones.total
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Monto total</span>
                <span class="estadistica__valor">{{
                  r.devoluciones.monto_total | moneda
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Pendientes</span>
                <span class="estadistica__valor">{{
                  r.devoluciones.pendientes
                }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Completadas</span>
                <span class="estadistica__valor">{{
                  r.devoluciones.completadas
                }}</span>
              </div>
            </div>
            <div class="mt-2 small muted">
              Por estado:
              @for (estado of estadosDevolucion(); track estado) {
                @if (r.devoluciones.por_estado[estado] !== undefined) {
                  <span class="chip"
                    >{{ estado }}: {{ r.devoluciones.por_estado[estado] }}</span
                  >
                }
              }
            </div>
          </div>

          <div class="tarjeta">
            <h2>Reclamos</h2>
            <div class="rejilla rejilla--4 mt-2">
              <div class="estadistica">
                <span class="estadistica__texto">Total</span>
                <span class="estadistica__valor">{{ r.reclamos.total }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Abiertos</span>
                <span class="estadistica__valor">{{ r.reclamos.abiertos }}</span>
              </div>
              <div class="estadistica">
                <span class="estadistica__texto">Vencidos SLA</span>
                <span class="estadistica__valor">{{
                  r.reclamos.vencidos_sla
                }}</span>
              </div>
            </div>
            <div class="mt-2 small muted">
              Por estado:
              @for (estado of estadosReclamo(); track estado) {
                @if (r.reclamos.por_estado[estado] !== undefined) {
                  <span class="chip"
                    >{{ estado }}: {{ r.reclamos.por_estado[estado] }}</span
                  >
                }
              }
            </div>
          </div>
        }

        @if (errorReporte()) {
          <div class="alerta alerta--error mt-2">
            <span>{{ errorReporte() }}</span>
          </div>
        }
      </div>
    </section>
  `,
})
export class ReportesAdmin implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly reporte = signal<ReporteAdministrativo | null>(null);
  protected readonly cargandoReporte = signal(false);
  protected readonly errorReporte = signal('');

  protected filtro = { desde: '', hasta: '' };

  protected readonly estadosSolicitud = signal<EstadoSolicitud[]>([
    'PUBLICADA',
    'CON_OFERTAS',
    'PENDIENTE_PAGO',
    'CONFIRMADA',
    'EN_PROGRESO',
    'TERMINADA_TRABAJADOR',
    'FINALIZADA',
    'ANULADA',
    'CANCELADA',
  ]);

  protected readonly estadosDevolucion = signal<EstadoDevolucion[]>([
    'PENDIENTE',
    'EN_PROCESO',
    'COMPLETADA',
  ]);

  protected readonly estadosReclamo = signal<EstadoReclamo[]>([
    'ABIERTO',
    'RESPONDIDO',
    'EN_REVISION_SUPERVISOR',
    'RESUELTO',
    'FALTA_TRABAJADOR',
    'RECHAZADO',
  ]);

  ngOnInit(): void {
    void this.generar();
  }

  protected async generar(): Promise<void> {
    this.cargandoReporte.set(true);
    this.errorReporte.set('');
    try {
      this.reporte.set(
        await this.adminService.reporteGeneral({
          desde: this.filtro.desde || undefined,
          hasta: this.filtro.hasta || undefined,
        }),
      );
    } catch (error) {
      this.errorReporte.set(mensajeDeError(error));
    } finally {
      this.cargandoReporte.set(false);
    }
  }
}