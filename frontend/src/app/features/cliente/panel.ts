import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  claseTonoSolicitud,
  etiquetaEstadoSolicitud,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type { Solicitud } from '../../core/models';
import { SolicitudesService } from '../../core/solicitudes.service';
import { FechaHoraPipe } from '../../shared/pipes';

@Component({
  selector: 'app-panel-cliente',
  imports: [RouterLink, FechaHoraPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Panel del cliente</span>
            <h1>
              Hola,
              {{
                auth.usuario()?.nombre_completo?.split(' ')?.[0]
              }}
            </h1>
            <p>
              Publica lo que necesitas o revisa el estado de tus
              solicitudes.
            </p>
          </div>
          <div class="fila">
            <a
              routerLink="/cliente/publicar"
              class="btn btn--ambar"
            >
              Publicar solicitud
            </a>
            <a
              routerLink="/cliente/buscar"
              class="btn btn--contorno"
            >
              Buscar técnicos
            </a>
          </div>
        </div>

        <div class="rejilla rejilla--3 seccion">
          <div class="tarjeta">
            <span class="estadistica__texto">Solicitudes activas</span>
            <span class="estadistica__valor">{{
              activas().length
            }}</span>
            <span class="small muted"
              >En búsqueda de técnico o en ejecución</span
            >
          </div>
          <div class="tarjeta">
            <span class="estadistica__texto">Total publicadas</span>
            <span class="estadistica__valor">{{
              solicitudes().length
            }}</span>
            <span class="small muted">Historial completo</span>
          </div>
          <div class="tarjeta">
            <span class="estadistica__texto">Rol activo</span>
            <span class="estadistica__valor" style="font-size: 1.2rem"
              >Cliente</span
            >
            <span class="small muted"
              >Puedes activar el rol de trabajador desde tu perfil
              si ofreces servicios.</span
            >
          </div>
        </div>

        <div class="rejilla rejilla--2 seccion">
          <div class="tarjeta">
            <div class="tarjeta__cabecera">
              <h2>Solicitudes recientes</h2>
              <a
                routerLink="/cliente/mis-solicitudes"
                class="small"
                >Ver todas</a
              >
            </div>

            @if (cargando()) {
              <div class="cargando">
                <span class="girador"></span>
                Cargando tus solicitudes…
              </div>
            } @else if (error()) {
              <div class="alerta alerta--error">
                <span>{{ error() }}</span>
              </div>
            } @else if (solicitudes().length === 0) {
              <div class="vacio">
                <div class="vacio__icono">+</div>
                <p>
                  Aún no publicaste ninguna solicitud. Cuéntanos qué
                  necesitas y recibe ofertas de técnicos de tu zona.
                </p>
                <a
                  routerLink="/cliente/publicar"
                  class="btn btn--primario"
                >
                  Publicar mi primera solicitud
                </a>
              </div>
            } @else {
              <div class="pila">
                @for (
                  solicitud of recientes();
                  track solicitud.id
                ) {
                  <a
                    [routerLink]="[
                      '/cliente/mis-solicitudes',
                      solicitud.id,
                    ]"
                    class="tarjeta tarjeta--plana"
                    style="color: inherit"
                  >
                    <div class="fila fila--separada">
                      <strong>{{ solicitud.tipo_problema }}</strong>
                      <span
                        class="insignia"
                        [class]="
                          'insignia ' + claseTono(solicitud.estado)
                        "
                      >
                        {{ etiquetaEstado(solicitud.estado) }}
                      </span>
                    </div>
                    <div class="small muted mt-1">
                      {{ solicitud.zona?.nombre }} ·
                      {{
                        solicitud.fecha_cita_preferida
                          | fechaHora
                      }}
                    </div>
                  </a>
                }
              </div>
            }
          </div>

          <div class="pila">
            <div class="tarjeta">
              <h2>Acciones rápidas</h2>
              <div class="pila mt-2">
                <a
                  routerLink="/cliente/publicar"
                  class="tarjeta tarjeta--plana"
                  style="color: inherit"
                >
                  <strong>Publicar una solicitud</strong>
                  <p class="small muted" style="margin: 0">
                    Describe el problema, sube fotos y elige tu
                    zona.
                  </p>
                </a>
                <a
                  routerLink="/cliente/buscar"
                  class="tarjeta tarjeta--plana"
                  style="color: inherit"
                >
                  <strong>Buscar un técnico</strong>
                  <p class="small muted" style="margin: 0">
                    Explora perfiles verificados por especialidad y
                    zona.
                  </p>
                </a>
                <a
                  routerLink="/cliente/mis-solicitudes"
                  class="tarjeta tarjeta--plana"
                  style="color: inherit"
                >
                  <strong>Revisar mis solicitudes</strong>
                  <p class="small muted" style="margin: 0">
                    Consulta ofertas, estados e historial.
                  </p>
                </a>
                <a
                  routerLink="/activar-trabajador"
                  class="tarjeta tarjeta--plana"
                  style="color: inherit"
                >
                  <strong>Ofrecer mis servicios</strong>
                  <p class="small muted" style="margin: 0">
                    Activa el rol de trabajador y recibe
                    solicitudes de tu zona.
                  </p>
                </a>
              </div>
            </div>

            <div class="tarjeta">
              <h3>Pago seguro</h3>
              <p class="small muted">
                Confirma al técnico pagando el 25% por QR. La
                dirección exacta y el contacto se revelan recién
                cuando la solicitud está confirmada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PanelCliente implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly solicitudesService = inject(
    SolicitudesService,
  );

  protected readonly solicitudes = signal<Solicitud[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly etiquetaEstado = etiquetaEstadoSolicitud;
  protected readonly claseTono = claseTonoSolicitud;

  protected readonly activas = computed(() =>
    this.solicitudes().filter(
      (solicitud) =>
        ![
          'FINALIZADA',
          'ANULADA',
          'CANCELADA',
        ].includes(solicitud.estado),
    ),
  );

  protected readonly recientes = computed(() =>
    this.solicitudes().slice(0, 4),
  );

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
