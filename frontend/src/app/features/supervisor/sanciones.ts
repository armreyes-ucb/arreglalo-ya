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
  claseTonoTrabajador,
  etiquetaEstadoTrabajador,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type { SuspensionRegistrada } from '../../core/models';
import { SupervisionService } from '../../core/supervision.service';
import { ToastService } from '../../core/toast.service';
import { FechaPipe } from '../../shared/pipes';

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

@Component({
  selector: 'app-sanciones-supervisor',
  imports: [CommonModule, FormsModule, FechaPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Supervisor</span>
            <h1>Suspensiones (Sanciones Fibonacci)</h1>
            <p>
              Lista de suspensiones activas e historial. Aplica nuevas
              suspensiones según la serie de Fibonacci (1, 2, 3, 5, 8, 13, 21
              días).
            </p>
          </div>
          <a routerLink="/supervisor" class="btn btn--contorno"
            >Volver al panel</a
          >
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando suspensiones…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else {
          <div class="tarjeta mb-2">
            <h2>Nueva suspensión</h2>
            <p class="small muted mt-1">
              Selecciona un trabajador (por ID) y el motivo. Los días se
              calculan automáticamente según su número de falta.
            </p>
            <div class="formulario--rejilla mt-2">
              <div class="campo">
                <label class="etiqueta" for="trabajador_id"
                  >ID del trabajador *</label
                >
                <input
                  id="trabajador_id"
                  type="text"
                  class="input"
                  [(ngModel)]="nuevaSuspension.trabajador_id"
                  placeholder="UUID del perfil del trabajador"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="motivo">Motivo *</label>
                <textarea
                  id="motivo"
                  class="input"
                  rows="2"
                  [(ngModel)]="nuevaSuspension.motivo"
                  placeholder="Describe la falta cometida"
                ></textarea>
              </div>
            </div>
            <div class="alerta alerta--info mt-2" style="margin:0">
              <span
                >La suspensión durará {{ diasFibonacci() }} día(s) según su
                {{ numeroFalta() }}.ª falta.</span
              >
            </div>
            <button
              type="button"
              class="btn btn--primario mt-2"
              [disabled]="aplicando() || !nuevaSuspension.trabajador_id.trim() || !nuevaSuspension.motivo.trim()"
              (click)="aplicar()"
            >
              {{ aplicando() ? 'Aplicando…' : 'Aplicar suspensión' }}
            </button>
          </div>

          @if (suspensiones().length === 0) {
            <div class="tarjeta centrado">
              <div class="vacio__icono">✓</div>
              <h2>No hay suspensiones registradas</h2>
              <p class="muted">El sistema está limpio.</p>
            </div>
          } @else {
            <div class="tarjeta">
              <h2>Suspensiones registradas</h2>
              <div class="pila mt-2">
                @for (s of suspensiones(); track s.id) {
                  <div class="tarjeta tarjeta--plana">
                    <div class="fila fila--separada">
                      <div>
                        <strong>{{ s.trabajador_id.slice(0, 8) }}…</strong>
                        <div class="small muted">
                          Falta #{{ s.numero_falta }} ·
                          {{ s.dias_fibonacci }} día(s) ·
                          {{ s.activa ? 'Activa' : 'Finalizada' }}
                        </div>
                        <p class="small mt-1">{{ s.motivo }}</p>
                        <div class="small muted">
                          {{ s.inicio | fecha }} → {{ s.fin | fecha }}
                        </div>
                      </div>
                      <span
                        class="insignia"
                        [class]="
                          'insignia ' +
                          (s.activa ? 'insignia--rojo' : 'insignia--neutro')
                        "
                      >
                        {{ s.activa ? 'Activa' : 'Finalizada' }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

        @if (errorSuspension()) {
          <div class="alerta alerta--error mt-2">
            <span>{{ errorSuspension() }}</span>
          </div>
        }
      </div>
    </section>
  `,
})
export class SancionesSupervisor implements OnInit {
  private readonly supervisionService = inject(SupervisionService);
  private readonly toast = inject(ToastService);

  protected readonly suspensiones = signal<SuspensionRegistrada[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly etiquetaEstadoTrabajador = etiquetaEstadoTrabajador;
  protected readonly claseTono = claseTonoTrabajador;

  protected nuevaSuspension = { trabajador_id: '', motivo: '' };
  protected readonly aplicando = signal(false);
  protected readonly errorSuspension = signal('');

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.suspensiones.set(await this.supervisionService.listarSuspensiones());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected numeroFalta(): number {
    const ids = new Set(
      this.suspensiones()
        .filter((s) => s.trabajador_id === this.nuevaSuspension.trabajador_id)
        .map((s) => s.numero_falta),
    );
    if (ids.size === 0) return 1;
    return Math.max(...ids) + 1;
  }

  protected diasFibonacci(): number {
    const n = this.numeroFalta();
    return FIBONACCI[n - 1] ?? FIBONACCI[FIBONACCI.length - 1];
  }

  protected async aplicar(): Promise<void> {
    this.errorSuspension.set('');
    this.aplicando.set(true);
    try {
      await this.supervisionService.aplicarSuspension({
        trabajador_id: this.nuevaSuspension.trabajador_id,
        motivo: this.nuevaSuspension.motivo,
      });
      this.toast.exito('Suspensión aplicada correctamente.');
      this.nuevaSuspension = { trabajador_id: '', motivo: '' };
      await this.cargar();
    } catch (error) {
      this.errorSuspension.set(mensajeDeError(error));
    } finally {
      this.aplicando.set(false);
    }
  }
}