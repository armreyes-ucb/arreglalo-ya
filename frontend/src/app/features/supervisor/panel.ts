import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  claseTonoTrabajador,
  etiquetaEstadoTrabajador,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type { ExpedienteVerificacion } from '../../core/models';
import { VerificacionService } from '../../core/verificacion.service';

@Component({
  selector: 'app-panel-supervisor',
  imports: [RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Supervisor</span>
            <h1>Panel de supervisión</h1>
            <p>
              Revisa expedientes de trabajadores y mantén la
              calidad de la plataforma.
            </p>
          </div>
          <a
            routerLink="/supervisor/verificaciones"
            class="btn btn--ambar"
          >
            Abrir bandeja de verificaciones
          </a>
        </div>

        @if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        }

        <div class="rejilla rejilla--3 seccion">
          <div class="tarjeta">
            <span class="estadistica__texto"
              >Expedientes en bandeja</span
            >
            <span class="estadistica__valor">{{
              expedientes().length
            }}</span>
            <span class="small muted">Pendientes de revisión</span>
          </div>
          <div class="tarjeta">
            <span class="estadistica__texto"
              >Con más de 48 horas</span
            >
            <span class="estadistica__valor">{{
              vencidos().length
            }}</span>
            <span class="small muted"
              >Prioriza estos casos</span
            >
          </div>
          <div class="tarjeta">
            <span class="estadistica__texto"
              >Documentos por revisar</span
            >
            <span class="estadistica__valor">{{
              documentosPendientes()
            }}</span>
            <span class="small muted"
              >En todos los expedientes</span
            >
          </div>
        </div>

        <div class="tarjeta">
          <div class="tarjeta__cabecera">
            <h2>Casos prioritarios</h2>
            <a
              routerLink="/supervisor/verificaciones"
              class="small"
              >Ver todos</a
            >
          </div>

          @if (cargando()) {
            <div class="cargando">
              <span class="girador"></span>
              Cargando bandeja…
            </div>
          } @else if (expedientes().length === 0) {
            <div class="vacio">
              <div class="vacio__icono">✓</div>
              <p>
                No hay expedientes pendientes. La bandeja está al
                día.
              </p>
            </div>
          } @else {
            <div class="pila">
              @for (
                expediente of prioritarios();
                track expediente.trabajador_id
              ) {
                <a
                  [routerLink]="[
                    '/supervisor/verificaciones',
                    expediente.trabajador_id,
                  ]"
                  class="tarjeta tarjeta--plana"
                  style="color: inherit"
                >
                  <div class="fila fila--separada">
                    <div>
                      <strong>{{
                        expediente.nombre_completo
                      }}</strong>
                      <div class="small muted">
                        {{ expediente.horas_en_espera }} h en
                        espera ·
                        {{
                          expediente.documentos.length
                        }}
                        documento(s)
                      </div>
                    </div>
                    @if (expediente.mas_de_48_horas) {
                      <span class="insignia insignia--rojo"
                        >Prioritario</span
                      >
                    } @else {
                      <span
                        class="insignia"
                        [class]="
                          'insignia ' +
                          claseTono(expediente.estado)
                        "
                      >
                        {{
                          etiquetaEstado(expediente.estado)
                        }}
                      </span>
                    }
                  </div>
                </a>
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class PanelSupervisor implements OnInit {
  private readonly verificacionService = inject(
    VerificacionService,
  );

  protected readonly expedientes =
    signal<ExpedienteVerificacion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly etiquetaEstado = etiquetaEstadoTrabajador;
  protected readonly claseTono = claseTonoTrabajador;

  protected readonly vencidos = computed(() =>
    this.expedientes().filter(
      (expediente) => expediente.mas_de_48_horas,
    ),
  );

  protected readonly prioritarios = computed(() =>
    this.expedientes().slice(0, 5),
  );

  protected readonly documentosPendientes = computed(() =>
    this.expedientes().reduce(
      (total, expediente) =>
        total +
        expediente.documentos.filter(
          (documento) => documento.estado === 'PENDIENTE',
        ).length,
      0,
    ),
  );

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    try {
      this.expedientes.set(
        await this.verificacionService.bandeja(),
      );
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
