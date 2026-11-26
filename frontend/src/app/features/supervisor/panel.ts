import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { claseTonoTrabajador, etiquetaEstadoTrabajador } from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type { AlertaSinOfertas, ExpedienteVerificacion } from '../../core/models';
import { SupervisionService } from '../../core/supervision.service';
import { VerificacionService } from '../../core/verificacion.service';
import { FechaHoraPipe } from '../../shared/pipes';

@Component({
  selector: 'app-panel-supervisor',
  imports: [RouterLink, FechaHoraPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Supervisor</span>
            <h1>Panel de supervisión</h1>
            <p>Revisa expedientes de trabajadores y mantén la calidad de la plataforma.</p>
          </div>
          <a routerLink="/supervisor/verificaciones" class="btn btn--ambar">
            Abrir bandeja de verificaciones
          </a>
        </div>

        @if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        }

        <div class="rejilla rejilla--4 seccion">
          <div class="tarjeta">
            <span class="estadistica__texto">Expedientes en bandeja</span>
            <span class="estadistica__valor">{{ expedientes().length }}</span>
            <span class="small muted">Pendientes de revisión</span>
          </div>
          <div class="tarjeta">
            <span class="estadistica__texto">Con más de 48 horas</span>
            <span class="estadistica__valor">{{ vencidos().length }}</span>
            <span class="small muted">Prioriza estos casos</span>
          </div>
          <div class="tarjeta">
            <span class="estadistica__texto">Documentos por revisar</span>
            <span class="estadistica__valor">{{ documentosPendientes() }}</span>
            <span class="small muted">En todos los expedientes</span>
          </div>
          <div class="tarjeta">
            <span class="estadistica__texto">Solicitudes sin ofertas</span>
            <span class="estadistica__valor">{{ alertas().length }}</span>
            <span class="small muted">Requieren ampliar plazo</span>
          </div>
        </div>

        <div class="rejilla rejilla--4 seccion">
          <div class="tarjeta">
            <h3>Verificaciones</h3>
            <p class="small muted">Expedientes de trabajadores</p>
            <a routerLink="/supervisor/verificaciones" class="btn btn--contorno btn--sm mt-1"
              >Ir a verificaciones</a
            >
          </div>
          <div class="tarjeta">
            <h3>Reclamos</h3>
            <p class="small muted">Bandeja y resolución</p>
            <a routerLink="/supervisor/reclamos" class="btn btn--contorno btn--sm mt-1"
              >Ir a reclamos</a
            >
          </div>
          <div class="tarjeta">
            <h3>Sanciones Fibonacci</h3>
            <p class="small muted">Aplicar suspensiones</p>
            <a routerLink="/supervisor/sanciones" class="btn btn--contorno btn--sm mt-1"
              >Ir a sanciones</a
            >
          </div>
          <div class="tarjeta">
            <h3>Clientes conflictivos</h3>
            <p class="small muted">Registrar y listar</p>
            <a routerLink="/supervisor/conflictivos" class="btn btn--contorno btn--sm mt-1"
              >Ir a conflictivos</a
            >
          </div>
          <div class="tarjeta">
            <h3>Alertas sin ofertas</h3>
            <p class="small muted">Solicitudes sin propuestas</p>
            <a routerLink="/supervisor/alertas-sin-ofertas" class="btn btn--contorno btn--sm mt-1"
              >Abrir panel</a
            >
          </div>
        </div>

        <div class="tarjeta">
          <h3>Devoluciones a supervisar</h3>
          <p class="small muted">Revisa las devoluciones pendientes de autorización.</p>
          <a routerLink="/supervisor/devoluciones" class="btn btn--contorno btn--sm mt-1"
            >Ver devoluciones</a
          >
        </div>

        <div class="tarjeta">
          <div class="tarjeta__cabecera">
            <h2>Alertas de solicitudes sin ofertas</h2>
            <a routerLink="/supervisor/alertas-sin-ofertas" class="small">Abrir panel</a>
          </div>

          @if (alertasCargando()) {
            <div class="cargando">
              <span class="girador"></span>
              Buscando solicitudes sin ofertas…
            </div>
          } @else if (alertas().length === 0) {
            <div class="vacio">
              <div class="vacio__icono">✓</div>
              <p>No hay solicitudes abiertas sin ofertas. Todo bajo control.</p>
            </div>
          } @else {
            <div class="pila">
              @for (alerta of alertas().slice(0, 5); track alerta.id) {
                <a
                  routerLink="/supervisor/alertas-sin-ofertas"
                  class="tarjeta tarjeta--plana"
                  style="color: inherit"
                >
                  <div class="fila fila--separada">
                    <div>
                      <strong>{{ alerta.tipo_problema }}</strong>
                      <div class="small muted">
                        {{ alerta.zona?.nombre ?? 'Sin zona' }} ·
                        {{ alerta.minutos_en_espera }} min sin ofertas · vence
                        {{ alerta.vence_en_actual | fechaHora }}
                      </div>
                    </div>
                    <span class="insignia insignia--rojo">Sin ofertas</span>
                  </div>
                </a>
              }
            </div>
          }
        </div>

        <div class="tarjeta">
          <div class="tarjeta__cabecera">
            <h2>Casos prioritarios</h2>
            <a routerLink="/supervisor/verificaciones" class="small">Ver todos</a>
          </div>

          @if (cargando()) {
            <div class="cargando">
              <span class="girador"></span>
              Cargando bandeja…
            </div>
          } @else if (expedientes().length === 0) {
            <div class="vacio">
              <div class="vacio__icono">✓</div>
              <p>No hay expedientes pendientes. La bandeja está al día.</p>
            </div>
          } @else {
            <div class="pila">
              @for (expediente of prioritarios(); track expediente.trabajador_id) {
                <a
                  [routerLink]="['/supervisor/verificaciones', expediente.trabajador_id]"
                  class="tarjeta tarjeta--plana"
                  style="color: inherit"
                >
                  <div class="fila fila--separada">
                    <div>
                      <strong>{{ expediente.nombre_completo }}</strong>
                      <div class="small muted">
                        {{ expediente.horas_en_espera }} h en espera ·
                        {{ expediente.documentos.length }}
                        documento(s)
                      </div>
                    </div>
                    @if (expediente.mas_de_48_horas) {
                      <span class="insignia insignia--rojo">Prioritario</span>
                    } @else {
                      <span class="insignia" [class]="'insignia ' + claseTono(expediente.estado)">
                        {{ etiquetaEstado(expediente.estado) }}
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
  private readonly verificacionService = inject(VerificacionService);
  private readonly supervisionService = inject(SupervisionService);

  protected readonly expedientes = signal<ExpedienteVerificacion[]>([]);
  protected readonly alertas = signal<AlertaSinOfertas[]>([]);
  protected readonly cargando = signal(true);
  protected readonly alertasCargando = signal(true);
  protected readonly error = signal('');
  protected readonly etiquetaEstado = etiquetaEstadoTrabajador;
  protected readonly claseTono = claseTonoTrabajador;

  protected readonly vencidos = computed(() =>
    this.expedientes().filter((expediente) => expediente.mas_de_48_horas),
  );

  protected readonly prioritarios = computed(() => this.expedientes().slice(0, 5));

  protected readonly documentosPendientes = computed(() =>
    this.expedientes().reduce(
      (total, expediente) =>
        total +
        expediente.documentos.filter((documento) => documento.estado === 'PENDIENTE').length,
      0,
    ),
  );

  ngOnInit(): void {
    void this.cargar();
    void this.cargarAlertas();
  }

  private async cargar(): Promise<void> {
    try {
      this.expedientes.set(await this.verificacionService.bandeja());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarAlertas(): Promise<void> {
    try {
      const listado = await this.supervisionService.listarAlertasSinOfertas();
      this.alertas.set(listado.alertas);
    } catch {
      this.alertas.set([]);
    } finally {
      this.alertasCargando.set(false);
    }
  }
}
