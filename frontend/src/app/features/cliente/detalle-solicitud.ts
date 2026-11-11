import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  claseTonoSolicitud,
  etiquetaEspecialidad,
  etiquetaEstadoSolicitud,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type { SolicitudDetalle } from '../../core/models';
import { SolicitudesService } from '../../core/solicitudes.service';
import {
  FechaHoraPipe,
  FechaPipe,
  ImagenUrlPipe,
} from '../../shared/pipes';

@Component({
  selector: 'app-detalle-solicitud',
  imports: [
    RouterLink,
    FechaPipe,
    FechaHoraPipe,
    ImagenUrlPipe,
  ],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <a
          routerLink="/cliente/mis-solicitudes"
          class="migaja"
          >← Volver a mis solicitudes</a
        >

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando solicitud…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else if (solicitud(); as detalle) {
          <div class="cabecera-pagina">
            <div>
              <div class="fila">
                <h1>{{ detalle.tipo_problema }}</h1>
                <span
                  class="insignia"
                  [class]="
                    'insignia ' + claseTono(detalle.estado)
                  "
                >
                  {{ etiquetaEstado(detalle.estado) }}
                </span>
                @if (detalle.urgente) {
                  <span class="insignia insignia--rojo"
                    >Urgente</span
                  >
                }
              </div>
              <p>
                {{
                  etiquetaEspecialidad(detalle.especialidad)
                }}
                · {{ detalle.zona?.nombre }}
              </p>
            </div>
          </div>

          <div class="rejilla rejilla--2">
            <div class="pila">
              <div class="tarjeta">
                <h2>Detalle del problema</h2>
                <p class="mt-1">{{ detalle.descripcion }}</p>
                @if (detalle.fotos_urls.length) {
                  <div class="galeria mt-2">
                    @for (
                      foto of detalle.fotos_urls;
                      track foto
                    ) {
                      <img
                        [src]="foto | imagenUrl"
                        alt="Foto de la solicitud"
                      />
                    }
                  </div>
                }
              </div>

              <div class="tarjeta">
                <h2>Datos del servicio</h2>
                <div class="pila mt-2">
                  <div class="fila fila--separada">
                    <span class="muted">Fecha preferida</span>
                    <strong>{{
                      detalle.fecha_cita_preferida | fechaHora
                    }}</strong>
                  </div>
                  <div class="fila fila--separada">
                    <span class="muted">Publicada</span>
                    <strong>{{
                      detalle.creada_en | fechaHora
                    }}</strong>
                  </div>
                  <div class="fila fila--separada">
                    <span class="muted">Vence</span>
                    <strong>{{
                      detalle.vence_en | fechaHora
                    }}</strong>
                  </div>
                  <div class="fila fila--separada">
                    <span class="muted">Ofertas recibidas</span>
                    <strong>{{ detalle.total_ofertas }}</strong>
                  </div>
                </div>
              </div>

              <div class="tarjeta">
                <h2>Dirección y contacto</h2>
                @if (direccionVisible()) {
                  <p class="mt-1">
                    <strong>{{ detalle.direccion_oculta }}</strong>
                  </p>
                  <div class="alerta alerta--exito">
                    <span>
                      La solicitud está confirmada: el técnico ya
                      puede ver tu dirección y coordinar por
                      WhatsApp.
                    </span>
                  </div>
                } @else {
                  <div class="alerta alerta--aviso">
                    <span>
                      La dirección
                      <strong>permanece oculta</strong> hasta que
                      la solicitud esté confirmada con el pago del
                      25% por QR (RN11).
                    </span>
                  </div>
                }
              </div>
            </div>

            <div class="pila">
              <div class="tarjeta">
                <h2>Historial de estados</h2>
                @if (detalle.historial.length === 0) {
                  <p class="small muted">
                    Todavía no hay eventos registrados.
                  </p>
                } @else {
                  <ul class="linea-tiempo mt-2">
                    @for (
                      evento of detalle.historial;
                      track evento.fecha_hora + evento.estado
                    ) {
                      <li>
                        <strong>{{
                          etiquetaEstado(evento.estado)
                        }}</strong>
                        <span>
                          {{ evento.fecha_hora | fecha }}
                          ·
                          {{
                            evento.usuario_nombre ??
                              'Sistema'
                          }}
                        </span>
                      </li>
                    }
                  </ul>
                }
              </div>

              <div class="tarjeta">
                <h3>¿Qué sigue?</h3>
                <p class="small muted">
                  Cuando los técnicos envíen ofertas podrás
                  compararlas y elegir la mejor. La selección de
                  oferta y el pago por QR se habilitan en el
                  siguiente sprint del proyecto.
                </p>
                <a
                  routerLink="/cliente/publicar"
                  class="btn btn--contorno btn--bloque"
                >
                  Publicar otra solicitud
                </a>
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class DetalleSolicitud implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly solicitudesService = inject(
    SolicitudesService,
  );

  protected readonly solicitud =
    signal<SolicitudDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly etiquetaEstado = etiquetaEstadoSolicitud;
  protected readonly etiquetaEspecialidad =
    etiquetaEspecialidad;
  protected readonly claseTono = claseTonoSolicitud;

  protected readonly direccionVisible = computed(() =>
    ['CONFIRMADA', 'EN_PROGRESO', 'TERMINADA_TRABAJADOR', 'FINALIZADA'].includes(
      this.solicitud()?.estado ?? '',
    ),
  );

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Solicitud no encontrada.');
      this.cargando.set(false);
      return;
    }
    try {
      this.solicitud.set(
        await this.solicitudesService.detalle(id),
      );
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
