import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  claseTonoOferta,
  claseTonoSolicitud,
  etiquetaEspecialidad,
  etiquetaEstadoOferta,
  etiquetaEstadoSolicitud,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type {
  EstadoOferta,
  OfertaConSolicitud,
} from '../../core/models';
import { SolicitudesService } from '../../core/solicitudes.service';
import {
  FechaHoraPipe,
  MonedaPipe,
} from '../../shared/pipes';

@Component({
  selector: 'app-mis-ofertas',
  imports: [RouterLink, FechaHoraPipe, MonedaPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Trabajador</span>
            <h1>Mis ofertas</h1>
            <p>
              Historial de las ofertas que enviaste a clientes.
            </p>
          </div>
          <a
            routerLink="/trabajador/trabajos"
            class="btn btn--ambar"
            >Buscar trabajos</a
          >
        </div>

        <div class="fila mb-2">
          @for (filtro of filtros; track filtro.valor) {
            <button
              type="button"
              class="chip"
              [class.chip--activo]="
                filtroActivo() === filtro.valor
              "
              (click)="filtroActivo.set(filtro.valor)"
            >
              {{ filtro.etiqueta }}
            </button>
          }
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando ofertas…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else if (filtradas().length === 0) {
          <div class="tarjeta">
            <div class="vacio">
              <div class="vacio__icono">+</div>
              <h3>No hay ofertas en este estado</h3>
              <p>
                Revisa los trabajos disponibles y envía tu primera
                oferta.
              </p>
              <a
                routerLink="/trabajador/trabajos"
                class="btn btn--primario"
              >
                Ver trabajos
              </a>
            </div>
          </div>
        } @else {
          <div class="pila">
            @for (oferta of filtradas(); track oferta.id) {
              <div class="tarjeta">
                <div class="fila fila--arriba fila--separada">
                  <div>
                    <div class="fila">
                      <strong>{{
                        oferta.solicitud.tipo_problema
                      }}</strong>
                      @if (oferta.solicitud.urgente) {
                        <span class="insignia insignia--rojo"
                          >Urgente</span
                        >
                      }
                    </div>
                    <p
                      class="small muted"
                      style="margin: 0.2rem 0 0"
                    >
                      {{
                        etiquetaEspecialidad(
                          oferta.solicitud.especialidad
                        )
                      }}
                      · {{ oferta.solicitud.zona?.nombre }}
                      · Solicitud
                      {{
                        etiquetaEstadoSolicitud(
                          oferta.solicitud.estado
                        )
                      }}
                    </p>
                  </div>
                  <span
                    class="insignia"
                    [class]="
                      'insignia ' + claseTonoOferta(oferta.estado)
                    "
                  >
                    {{ etiquetaEstadoOferta(oferta.estado) }}
                  </span>
                </div>

                <div class="rejilla rejilla--3 mt-2">
                  <div class="estadistica">
                    <span class="estadistica__texto"
                      >Precio estimado</span
                    >
                    <strong>{{
                      oferta.precio_estimado | moneda
                    }}</strong>
                  </div>
                  <div class="estadistica">
                    <span class="estadistica__texto"
                      >Transporte</span
                    >
                    <strong>{{
                      oferta.costo_transporte | moneda
                    }}</strong>
                  </div>
                  <div class="estadistica">
                    <span class="estadistica__texto"
                      >Total</span
                    >
                    <strong>{{
                      (oferta.precio_estimado +
                        oferta.costo_transporte) | moneda
                    }}</strong>
                  </div>
                </div>

                <div
                  class="fila fila--separada mt-2"
                  style="border-top: 1px solid var(--borde); padding-top: 0.65rem"
                >
                  <span class="small muted">
                    Enviada: {{ oferta.creada_en | fechaHora }}
                  </span>
                  <span class="small muted">
                    Cita propuesta:
                    {{ oferta.fecha_propuesta | fechaHora }}
                  </span>
                </div>
                @if (oferta.mensaje) {
                  <p class="small mt-1">“{{ oferta.mensaje }}”</p>
                }
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class MisOfertas implements OnInit {
  private readonly solicitudesService = inject(
    SolicitudesService,
  );

  protected readonly ofertas =
    signal<OfertaConSolicitud[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly filtroActivo = signal<
    EstadoOferta | 'TODAS'
  >('TODAS');
  protected readonly etiquetaEspecialidad =
    etiquetaEspecialidad;
  protected readonly etiquetaEstadoSolicitud =
    etiquetaEstadoSolicitud;
  protected readonly etiquetaEstadoOferta = etiquetaEstadoOferta;
  protected readonly claseTonoOferta = claseTonoOferta;
  protected readonly claseTonoSolicitud = claseTonoSolicitud;

  protected readonly filtros: Array<{
    valor: EstadoOferta | 'TODAS';
    etiqueta: string;
  }> = [
    { valor: 'TODAS', etiqueta: 'Todas' },
    { valor: 'ENVIADA', etiqueta: 'Enviadas' },
    { valor: 'ELEGIDA', etiqueta: 'Elegidas' },
    { valor: 'CERRADA', etiqueta: 'Cerradas' },
    { valor: 'RECHAZADA', etiqueta: 'Rechazadas' },
  ];

  protected readonly filtradas = computed(() => {
    const filtro = this.filtroActivo();
    if (filtro === 'TODAS') {
      return this.ofertas();
    }
    return this.ofertas().filter(
      (oferta) => oferta.estado === filtro,
    );
  });

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.ofertas.set(
        await this.solicitudesService.misOfertas(),
      );
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
