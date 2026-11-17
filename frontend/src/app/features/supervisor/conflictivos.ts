import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mensajeDeError } from '../../core/errores';
import type { ClienteConflictivoPublico } from '../../core/models';
import { SupervisionService } from '../../core/supervision.service';
import { ToastService } from '../../core/toast.service';
import { FechaPipe } from '../../shared/pipes';

@Component({
  selector: 'app-conflictivos-supervisor',
  imports: [CommonModule, FormsModule, FechaPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Supervisor</span>
            <h1>Clientes conflictivos</h1>
            <p>
              Registro de clientes con reportes repetidos (no pagan 75%,
              maltratan, cancelan reiteradamente). A partir de 3 reportes se
              advierte al técnico.
            </p>
          </div>
          <a routerLink="/supervisor" class="btn btn--contorno"
            >Volver al panel</a
          >
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando registro…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else {
          <div class="tarjeta mb-2">
            <h2>Registrar cliente conflictivo</h2>
            <p class="small muted mt-1">
              Ingresa el ID del cliente y el motivo. Se sumará al contador de
              reportes.
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
              [disabled]="registrando() || !nuevoConflictivo.cliente_id.trim() || !nuevoConflictivo.motivo.trim()"
              (click)="registrar()"
            >
              {{ registrando() ? 'Registrando…' : 'Registrar cliente conflictivo' }}
            </button>
          </div>

          @if (conflictivos().length === 0) {
            <div class="tarjeta centrado">
              <div class="vacio__icono">✓</div>
              <h2>No hay clientes conflictivos registrados</h2>
              <p class="muted">El registro está limpio.</p>
            </div>
          } @else {
            <div class="tarjeta">
              <h2>Clientes registrados</h2>
              <div class="tabla-responsive mt-2">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Reportes</th>
                      <th>Motivo</th>
                      <th>Fecha</th>
                      <th>Advertir</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of conflictivos(); track c.id) {
                      <tr>
                        <td>{{ c.cliente_id.slice(0, 8) }}…</td>
                        <td>
                          <span
                            class="insignia"
                            [class]="
                              c.reportes_acumulados >= 3
                                ? 'insignia--rojo'
                                : 'insignia--ambar'
                            "
                          >
                            {{ c.reportes_acumulados }}
                          </span>
                        </td>
                        <td class="small">{{ c.motivo }}</td>
                        <td>{{ c.fecha_registro | fecha }}</td>
                        <td>
                          <span
                            class="insignia"
                            [class]="
                              c.advertir ? 'insignia--rojo' : 'insignia--neutro'
                            "
                          >
                            {{ c.advertir ? 'Sí' : 'No' }}
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

        @if (errorRegistro()) {
          <div class="alerta alerta--error mt-2">
            <span>{{ errorRegistro() }}</span>
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

  protected nuevoConflictivo = { cliente_id: '', motivo: '' };
  protected readonly registrando = signal(false);
  protected readonly errorRegistro = signal('');

  ngOnInit(): void {
    void this.cargar();
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