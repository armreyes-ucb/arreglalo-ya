import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  claseTonoSolicitud,
  etiquetaEspecialidad,
  etiquetaEstadoSolicitud,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type { EstadoSolicitud, Solicitud } from '../../core/models';
import { SolicitudesService } from '../../core/solicitudes.service';
import { FechaHoraPipe, ImagenUrlPipe } from '../../shared/pipes';

interface FiltroEstado {
  valor: EstadoSolicitud | 'TODAS';
  etiqueta: string;
}

@Component({
  selector: 'app-mis-solicitudes',
  imports: [RouterLink, FechaHoraPipe, ImagenUrlPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Cliente</span>
            <h1>Mis solicitudes</h1>
            <p>Revisa el estado y el historial de cada trabajo.</p>
          </div>
          <a
            routerLink="/cliente/publicar"
            class="btn btn--ambar"
          >
            Nueva solicitud
          </a>
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
            Cargando solicitudes…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else if (filtradas().length === 0) {
          <div class="tarjeta">
            <div class="vacio">
              <div class="vacio__icono">+</div>
              <h3>No hay solicitudes en este estado</h3>
              <p>
                Publica una nueva solicitud o cambia el filtro para
                ver otras.
              </p>
              <a
                routerLink="/cliente/publicar"
                class="btn btn--primario"
              >
                Publicar solicitud
              </a>
            </div>
          </div>
        } @else {
          <div class="pila">
            @for (
              solicitud of filtradas();
              track solicitud.id
            ) {
              <a
                [routerLink]="[
                  '/cliente/mis-solicitudes',
                  solicitud.id,
                ]"
                class="tarjeta"
                style="color: inherit"
              >
                <div class="fila fila--arriba fila--separada">
                  <div class="fila fila--arriba">
                    @if (solicitud.fotos_urls.length) {
                      <img
                        [src]="solicitud.fotos_urls[0] | imagenUrl"
                        alt=""
                        style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--borde)"
                      />
                    }
                    <div>
                      <div class="fila">
                        <strong>{{ solicitud.tipo_problema }}</strong>
                        @if (solicitud.urgente) {
                          <span
                            class="insignia insignia--rojo"
                            >Urgente</span
                          >
                        }
                      </div>
                      <div class="small muted">
                        {{
                          etiquetaEspecialidad(
                            solicitud.especialidad
                          )
                        }}
                        · {{ solicitud.zona?.nombre }}
                      </div>
                      <div class="small muted">
                        Cita:
                        {{
                          solicitud.fecha_cita_preferida
                            | fechaHora
                        }}
                      </div>
                    </div>
                  </div>
                  <span
                    class="insignia"
                    [class]="
                      'insignia ' +
                      claseTono(solicitud.estado)
                    "
                  >
                    {{ etiquetaEstado(solicitud.estado) }}
                  </span>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class MisSolicitudes implements OnInit {
  private readonly solicitudesService = inject(
    SolicitudesService,
  );

  protected readonly solicitudes = signal<Solicitud[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly filtroActivo = signal<
    EstadoSolicitud | 'TODAS'
  >('TODAS');
  protected readonly etiquetaEstado = etiquetaEstadoSolicitud;
  protected readonly etiquetaEspecialidad =
    etiquetaEspecialidad;
  protected readonly claseTono = claseTonoSolicitud;

  protected readonly filtros: FiltroEstado[] = [
    { valor: 'TODAS', etiqueta: 'Todas' },
    { valor: 'PUBLICADA', etiqueta: 'Publicadas' },
    { valor: 'CON_OFERTAS', etiqueta: 'Con ofertas' },
    { valor: 'CONFIRMADA', etiqueta: 'Confirmadas' },
    { valor: 'EN_PROGRESO', etiqueta: 'En progreso' },
    { valor: 'FINALIZADA', etiqueta: 'Finalizadas' },
    { valor: 'CANCELADA', etiqueta: 'Canceladas' },
  ];

  protected readonly filtradas = computed(() => {
    const filtro = this.filtroActivo();
    if (filtro === 'TODAS') {
      return this.solicitudes();
    }
    return this.solicitudes().filter(
      (solicitud) => solicitud.estado === filtro,
    );
  });

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.solicitudes.set(await this.solicitudesService.mias());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
