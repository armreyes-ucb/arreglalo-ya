import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { mensajeDeError } from '../../core/errores';
import type { DevolucionPublica } from '../../core/models';
import { SupervisionService } from '../../core/supervision.service';
import { ToastService } from '../../core/toast.service';
import { FechaPipe } from '../../shared/pipes';
import { MonedaPipe } from '../../shared/pipes';

@Component({
  selector: 'app-devoluciones-supervisor',
  imports: [CommonModule, FechaPipe, MonedaPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Supervisor</span>
            <h1>Devoluciones</h1>
            <p>
              Lista de devoluciones del pago inicial (25%) procesadas o pendientes. RN04: máximo 3
              días hábiles.
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
          @if (devoluciones().length === 0) {
            <div class="tarjeta centrado">
              <div class="vacio__icono">↩️</div>
              <h2>No hay devoluciones registradas</h2>
              <p class="muted">Todas las solicitudes se cerraron sin devoluciones.</p>
            </div>
          } @else {
            <div class="tarjeta">
              <div class="tabla-responsive mt-2">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Pago</th>
                      <th>Motivo</th>
                      <th>Monto</th>
                      <th>Fecha límite</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of devoluciones(); track d.id) {
                      <tr>
                        <td>{{ d.id.slice(0, 8) }}…</td>
                        <td>{{ d.pago_id.slice(0, 8) }}…</td>
                        <td class="small">{{ d.motivo }}</td>
                        <td>{{ d.monto | moneda }}</td>
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

  protected readonly devoluciones = signal<DevolucionPublica[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.devoluciones.set(await this.supervisionService.listarDevoluciones());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
