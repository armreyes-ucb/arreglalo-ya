import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  claseTonoPago,
  claseTonoSolicitud,
  etiquetaEspecialidad,
  etiquetaEstadoQr,
  etiquetaEstadoSolicitud,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type {
  OfertaConTrabajador,
  Pago,
  SolicitudDetalle,
} from '../../core/models';
import { PagosService } from '../../core/pagos.service';
import { SolicitudesService } from '../../core/solicitudes.service';
import { ToastService } from '../../core/toast.service';
import {
  FechaHoraPipe,
  FechaPipe,
  ImagenUrlPipe,
  MonedaPipe,
} from '../../shared/pipes';

@Component({
  selector: 'app-detalle-solicitud',
  imports: [
    RouterLink,
    FechaPipe,
    FechaHoraPipe,
    ImagenUrlPipe,
    MonedaPipe,
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
            @if (verSeguimiento()) {
              <a
                [routerLink]="[
                  '/cliente/mis-solicitudes',
                  detalle.id,
                  'seguimiento',
                ]"
                class="btn btn--primario"
                >Ver seguimiento</a
              >
            }
          </div>

          @if (pago(); as pagoActual) {
            <div class="tarjeta tarjeta--destacada mb-2">
              <div class="fila fila--separada fila--arriba">
                <div>
                  <h2 style="margin:0">Pago inicial del 25%</h2>
                  <p class="small muted" style="margin:0.2rem 0 0">
                    El técnico recibe el 20% y la plataforma
                    retiene el 5%.
                  </p>
                </div>
                <span
                  class="insignia"
                  [class]="
                    'insignia ' +
                    claseTonoPago(pagoActual.estado_qr)
                  "
                >
                  {{ etiquetaEstadoQr(pagoActual.estado_qr) }}
                </span>
              </div>

              <div class="rejilla rejilla--4 mt-2">
                <div class="estadistica">
                  <span class="estadistica__texto"
                    >Precio acordado</span
                  >
                  <strong>{{
                    pagoActual.precio_total_acordado | moneda
                  }}</strong>
                </div>
                <div class="estadistica">
                  <span class="estadistica__texto"
                    >Pago por QR (25%)</span
                  >
                  <strong>{{
                    pagoActual.pago_inicial_25 | moneda
                  }}</strong>
                </div>
                <div class="estadistica">
                  <span class="estadistica__texto"
                    >Parte del técnico (20%)</span
                  >
                  <strong>{{
                    pagoActual.parte_trabajador_20 | moneda
                  }}</strong>
                </div>
                <div class="estadistica">
                  <span class="estadistica__texto"
                    >Saldo en persona (75%)</span
                  >
                  <strong>{{
                    pagoActual.saldo_75 | moneda
                  }}</strong>
                </div>
              </div>

              @if (pagoActual.estado_qr === 'PAGADO') {
                <div class="alerta alerta--exito mt-2">
                  <span>
                    Pago confirmado. La dirección exacta y el
                    contacto por WhatsApp ya están habilitados en
                    el seguimiento.
                  </span>
                </div>
              } @else if (pagoActual.estado_qr === 'VENCIDO') {
                <div class="alerta alerta--aviso mt-2">
                  <span>
                    El QR venció. Genera uno nuevo para continuar
                    con el pago.
                  </span>
                </div>
                <button
                  type="button"
                  class="btn btn--ambar btn--bloque mt-2"
                  [disabled]="procesando()"
                  (click)="regenerarQr()"
                >
                  Generar nuevo QR
                </button>
              } @else {
                <button
                  type="button"
                  class="btn btn--ambar btn--bloque mt-2"
                  [disabled]="procesando()"
                  (click)="abrirQr()"
                >
                  Ver QR de pago
                </button>
              }
            </div>
          }

          @if (mostrarComparador()) {
            <div class="tarjeta mb-2">
              <div class="fila fila--separada fila--arriba">
                <div>
                  <h2 style="margin:0">Comparador de ofertas</h2>
                  <p class="small muted" style="margin:0.2rem 0 0">
                    {{ ofertas().length }} oferta(s) recibida(s).
                    Compara precio, reputación y fecha propuesta.
                  </p>
                </div>
                <div class="fila">
                  <span class="small muted">Ordenar por</span>
                  @for (opcion of opcionesOrden; track opcion.valor) {
                    <button
                      type="button"
                      class="chip"
                      [class.chip--activo]="
                        orden() === opcion.valor
                      "
                      (click)="orden.set(opcion.valor)"
                    >
                      {{ opcion.etiqueta }}
                    </button>
                  }
                </div>
              </div>

              @if (cargandoOfertas()) {
                <div class="cargando">
                  <span class="girador"></span>
                  Cargando ofertas…
                </div>
              } @else if (ofertas().length === 0) {
                <div class="vacio">
                  <div class="vacio__icono">+</div>
                  <h3>Todavía no hay ofertas</h3>
                  <p>
                    Los técnicos de tu zona están revisando la
                    solicitud. Te avisaremos cuando llegue la
                    primera propuesta.
                  </p>
                </div>
              } @else {
                <div class="rejilla rejilla--2 mt-2">
                  @for (
                    oferta of ofertasOrdenadas();
                    track oferta.id
                  ) {
                    <div class="tarjeta tarjeta--plana">
                      <div
                        class="fila fila--separada fila--arriba"
                      >
                        <div>
                          <strong>{{
                            oferta.trabajador.nombre_completo
                          }}</strong>
                          <p
                            class="small muted"
                            style="margin: 0.2rem 0 0"
                          >
                            ★
                            {{
                              oferta.trabajador.promedio.toFixed(
                                1
                              )
                            }}
                            · {{
                              oferta.trabajador
                                .trabajos_completados
                            }}
                            trabajo(s) completado(s)
                          </p>
                        </div>
                        @if (
                          oferta.trabajador.nivel_verificacion >= 2
                        ) {
                          <span class="insignia insignia--verde"
                            >Verificado</span
                          >
                        } @else {
                          <span class="insignia insignia--neutro"
                            >En verificación</span
                          >
                        }
                      </div>

                      <div class="fila mt-2">
                        @for (
                          especialidad of oferta.trabajador
                            .especialidades;
                          track especialidad
                        ) {
                          <span class="chip chip--activo">{{
                            etiquetaEspecialidad(especialidad)
                          }}</span>
                        }
                      </div>

                      <p class="small muted mt-1">
                        Zonas:
                        {{
                          nombresZonas(oferta.trabajador.zonas)
                        }}
                      </p>

                      <div class="rejilla rejilla--3 mt-2">
                        <div class="estadistica">
                          <span class="estadistica__texto"
                            >Precio</span
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
                            >Total estimado</span
                          >
                          <strong>{{
                            totalOferta(oferta) | moneda
                          }}</strong>
                        </div>
                      </div>

                      <p class="small muted mt-2">
                        Cita propuesta:
                        {{ oferta.fecha_propuesta | fechaHora }}
                      </p>
                      @if (oferta.mensaje) {
                        <p class="small mt-1">
                          “{{ oferta.mensaje }}”
                        </p>
                      }

                      @if (puedeElegir()) {
                        <button
                          type="button"
                          class="btn btn--primario btn--bloque mt-2"
                          (click)="elegir(oferta)"
                        >
                          Elegir esta oferta
                        </button>
                      } @else if (
                        oferta.estado === 'ELEGIDA'
                      ) {
                        <span
                          class="insignia insignia--verde mt-2"
                          >Oferta elegida</span
                        >
                      }
                    </div>
                  }
                </div>
              }

              @if (solicitud()?.estado === 'CON_OFERTAS') {
                <div class="alerta alerta--info mt-2">
                  <span>
                    Al elegir una oferta se genera el QR del 25%.
                    Las demás ofertas se cerrarán
                    automáticamente.
                  </span>
                </div>
              }
            </div>
          }

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
                  @if (detalle.whatsapp_url) {
                    <a
                      class="btn btn--primario btn--bloque mt-2"
                      [href]="detalle.whatsapp_url"
                      target="_blank"
                      rel="noopener"
                      >Contactar por WhatsApp</a
                    >
                  }
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
                  @if (verSeguimiento()) {
                    Revisa el seguimiento para coordinar el
                    trabajo, registrar el precio final y cerrar el
                    cobro.
                  } @else {
                    Cuando elijas una oferta podrás pagar el 25%
                    por QR. El seguimiento se habilita al
                    confirmar el pago.
                  }
                </p>
                @if (verSeguimiento()) {
                  <a
                    [routerLink]="[
                      '/cliente/mis-solicitudes',
                      detalle.id,
                      'seguimiento',
                    ]"
                    class="btn btn--primario btn--bloque"
                  >
                    Ir al seguimiento
                  </a>
                } @else {
                  <a
                    routerLink="/cliente/publicar"
                    class="btn btn--contorno btn--bloque"
                  >
                    Publicar otra solicitud
                  </a>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </section>

    @if (ofertaElegida(); as oferta) {
      <div class="modal-fondo" (click)="cerrarConfirmacion()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="fila fila--separada">
            <h2 style="margin:0">Confirmar oferta</h2>
            <button
              type="button"
              class="enlace-boton"
              (click)="cerrarConfirmacion()"
            >
              Cerrar
            </button>
          </div>
          <p class="small muted">
            {{ oferta.trabajador.nombre_completo }} · ★
            {{ oferta.trabajador.promedio.toFixed(1) }}
          </p>

          <div class="rejilla rejilla--2 mt-2">
            <div class="estadistica">
              <span class="estadistica__texto">Precio</span>
              <strong>{{
                oferta.precio_estimado | moneda
              }}</strong>
            </div>
            <div class="estadistica">
              <span class="estadistica__texto"
                >Pago inicial (25%)</span
              >
              <strong>{{ pagoInicialEstimado(oferta) | moneda }}</strong>
            </div>
          </div>
          <p class="small muted" style="margin-top: 0.4rem">
            El 25% se calcula sobre el precio ofertado (con
            recargo urgente si aplica) y no incluye el
            transporte.
          </p>

          <div class="alerta alerta--info mt-2">
            <span>
              Al confirmar se generará el QR del 25%. Las demás
              ofertas se cerrarán y el técnico verá tu dirección
              exacta cuando el pago se acredite.
            </span>
          </div>

          @if (errorPago()) {
            <div class="alerta alerta--error mt-2">
              <span>{{ errorPago() }}</span>
            </div>
          }

          <button
            type="button"
            class="btn btn--primario btn--bloque mt-2"
            [disabled]="procesando()"
            (click)="confirmarEleccion()"
          >
            {{ procesando() ? 'Generando QR…' : 'Confirmar y generar QR' }}
          </button>
        </div>
      </div>
    }

    @if (mostrarQr() && pago(); as pagoActual) {
      <div class="modal-fondo" (click)="cerrarQr()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="fila fila--separada">
            <h2 style="margin:0">Pagar el 25% por QR</h2>
            <button
              type="button"
              class="enlace-boton"
              (click)="cerrarQr()"
            >
              Cerrar
            </button>
          </div>

          <div class="pila" style="align-items: center">
            @if (pagoActual.codigo_qr_data) {
              <img
                [src]="pagoActual.codigo_qr_data"
                alt="Código QR para el pago inicial"
                style="width: 220px; height: 220px"
              />
            }
            <div class="estadistica" style="text-align: center">
              <span class="estadistica__texto"
                >Monto a pagar</span
              >
              <strong class="estadistica__valor">{{
                pagoActual.pago_inicial_25 | moneda
              }}</strong>
            </div>
            <span
              class="insignia"
              [class]="
                'insignia ' +
                claseTonoPago(pagoActual.estado_qr)
              "
            >
              {{ etiquetaEstadoQr(pagoActual.estado_qr) }}
            </span>
            @if (
              pagoActual.estado_qr === 'PENDIENTE' &&
              segundosQr() > 0
            ) {
              <p class="small muted">
                El QR vence en {{ tiempoQr() }}
              </p>
            }
          </div>

          @if (pagoActual.estado_qr === 'PENDIENTE') {
            @if (segundosQr() <= 0) {
              <div class="alerta alerta--aviso mt-2">
                <span>
                  El QR venció. Genera uno nuevo para continuar.
                </span>
              </div>
              <button
                type="button"
                class="btn btn--ambar btn--bloque mt-2"
                [disabled]="procesando()"
                (click)="regenerarQr()"
              >
                Generar nuevo QR
              </button>
            } @else {
              <button
                type="button"
                class="btn btn--primario btn--bloque mt-2"
                [disabled]="procesando()"
                (click)="simularPago()"
              >
                {{
                  procesando()
                    ? 'Confirmando pago…'
                    : 'Simular pago del banco'
                }}
              </button>
              <p
                class="small muted"
                style="text-align: center; margin-top: 0.5rem"
              >
                Botón de simulación: representa la confirmación
                del banco.
              </p>
            }
          } @else if (pagoActual.estado_qr === 'PAGADO') {
            <div class="alerta alerta--exito mt-2">
              <span>
                Pago confirmado. Ya puedes coordinar con el
                técnico desde el seguimiento.
              </span>
            </div>
            <a
              [routerLink]="[
                '/cliente/mis-solicitudes',
                pagoActual.solicitud_id,
                'seguimiento',
              ]"
              class="btn btn--primario btn--bloque mt-2"
            >
              Ir al seguimiento
            </a>
          }
        </div>
      </div>
    }
  `,
})
export class DetalleSolicitud implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly solicitudesService = inject(
    SolicitudesService,
  );
  private readonly pagosService = inject(PagosService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly solicitud =
    signal<SolicitudDetalle | null>(null);
  protected readonly ofertas = signal<OfertaConTrabajador[]>(
    [],
  );
  protected readonly pago = signal<Pago | null>(null);
  protected readonly cargando = signal(true);
  protected readonly cargandoOfertas = signal(false);
  protected readonly procesando = signal(false);
  protected readonly error = signal('');
  protected readonly errorPago = signal('');
  protected readonly ofertaElegida =
    signal<OfertaConTrabajador | null>(null);
  protected readonly mostrarQr = signal(false);
  protected readonly segundosQr = signal(0);
  protected readonly orden = signal<'precio' | 'reputacion'>(
    'precio',
  );

  protected readonly etiquetaEstado = etiquetaEstadoSolicitud;
  protected readonly etiquetaEstadoQr = etiquetaEstadoQr;
  protected readonly etiquetaEspecialidad =
    etiquetaEspecialidad;
  protected readonly claseTono = claseTonoSolicitud;
  protected readonly claseTonoPago = claseTonoPago;

  protected readonly opcionesOrden: Array<{
    valor: 'precio' | 'reputacion';
    etiqueta: string;
  }> = [
    { valor: 'precio', etiqueta: 'Precio' },
    { valor: 'reputacion', etiqueta: 'Reputación' },
  ];

  private intervaloCodigo: ReturnType<typeof setInterval> | null =
    null;

  protected readonly direccionVisible = computed(() =>
    [
      'CONFIRMADA',
      'EN_PROGRESO',
      'TERMINADA_TRABAJADOR',
      'FINALIZADA',
    ].includes(this.solicitud()?.estado ?? ''),
  );

  protected readonly verSeguimiento = computed(() =>
    [
      'CONFIRMADA',
      'EN_PROGRESO',
      'TERMINADA_TRABAJADOR',
      'FINALIZADA',
      'CANCELADA',
      'ANULADA',
    ].includes(this.solicitud()?.estado ?? ''),
  );

  protected readonly mostrarComparador = computed(() =>
    ['PUBLICADA', 'CON_OFERTAS', 'PENDIENTE_PAGO'].includes(
      this.solicitud()?.estado ?? '',
    ),
  );

  protected readonly puedeElegir = computed(() =>
    ['PUBLICADA', 'CON_OFERTAS'].includes(
      this.solicitud()?.estado ?? '',
    ),
  );

  protected readonly ofertasOrdenadas = computed(() => {
    const lista = [...this.ofertas()];
    if (this.orden() === 'reputacion') {
      return lista.sort(
        (a, b) =>
          b.trabajador.promedio - a.trabajador.promedio ||
          b.trabajador.trabajos_completados -
            a.trabajador.trabajos_completados,
      );
    }
    return lista.sort(
      (a, b) => this.totalOferta(a) - this.totalOferta(b),
    );
  });

  protected readonly tiempoQr = computed(() => {
    const total = this.segundosQr();
    const minutos = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const segundos = (total % 60).toString().padStart(2, '0');
    return `${minutos}:${segundos}`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.detenerContador());
  }

  ngOnInit(): void {
    void this.cargar();
  }

  protected totalOferta(oferta: OfertaConTrabajador): number {
    return oferta.precio_estimado + oferta.costo_transporte;
  }

  protected pagoInicialEstimado(
    oferta: OfertaConTrabajador,
  ): number {
    const precio = this.solicitud()?.urgente
      ? oferta.precio_estimado * 1.1
      : oferta.precio_estimado;
    const total = Math.round(precio * 2) / 2;
    return Math.round(total * 0.25 * 2) / 2;
  }

  protected nombresZonas(
    zonas: Array<{ nombre: string }>,
  ): string {
    if (zonas.length === 0) {
      return 'sin zonas registradas';
    }
    return zonas.map((zona) => zona.nombre).join(', ');
  }

  protected elegir(oferta: OfertaConTrabajador): void {
    this.errorPago.set('');
    this.ofertaElegida.set(oferta);
  }

  protected cerrarConfirmacion(): void {
    if (!this.procesando()) {
      this.ofertaElegida.set(null);
    }
  }

  protected async confirmarEleccion(): Promise<void> {
    const oferta = this.ofertaElegida();
    const detalle = this.solicitud();
    if (!oferta || !detalle) {
      return;
    }

    this.procesando.set(true);
    this.errorPago.set('');
    try {
      const pago = await this.solicitudesService.elegirOferta(
        detalle.id,
        oferta.id,
      );
      this.pago.set(pago);
      this.ofertaElegida.set(null);
      this.mostrarQr.set(true);
      this.iniciarContador();
      this.toast.exito(
        'Oferta elegida. Escanea o simula el pago del QR.',
      );
      await this.cargar();
    } catch (error) {
      this.errorPago.set(mensajeDeError(error));
    } finally {
      this.procesando.set(false);
    }
  }

  protected abrirQr(): void {
    this.mostrarQr.set(true);
    this.iniciarContador();
  }

  protected cerrarQr(): void {
    if (!this.procesando()) {
      this.mostrarQr.set(false);
    }
  }

  protected async simularPago(): Promise<void> {
    const pago = this.pago();
    if (!pago) {
      return;
    }

    this.procesando.set(true);
    this.errorPago.set('');
    try {
      const actualizado =
        await this.pagosService.confirmarPago(pago.id);
      this.pago.set(actualizado);
      this.detenerContador();
      this.toast.exito(
        'Pago del 25% confirmado. El técnico ya puede ver tu dirección.',
      );
      await this.cargar();
      this.mostrarQr.set(false);
    } catch (error) {
      this.errorPago.set(mensajeDeError(error));
    } finally {
      this.procesando.set(false);
    }
  }

  protected async regenerarQr(): Promise<void> {
    const detalle = this.solicitud();
    if (!detalle) {
      return;
    }

    this.procesando.set(true);
    this.errorPago.set('');
    try {
      const ofertas =
        await this.solicitudesService.ofertas(detalle.id);
      this.ofertas.set(ofertas);
      const elegida = ofertas.find(
        (oferta) => oferta.estado === 'ELEGIDA',
      );
      if (!elegida) {
        throw new Error(
          'No se encontró la oferta elegida para regenerar el QR.',
        );
      }
      const pago = await this.solicitudesService.elegirOferta(
        detalle.id,
        elegida.id,
      );
      this.pago.set(pago);
      this.mostrarQr.set(true);
      this.iniciarContador();
      this.toast.info('Se generó un nuevo QR de pago.');
      await this.cargar();
    } catch (error) {
      this.errorPago.set(mensajeDeError(error));
    } finally {
      this.procesando.set(false);
    }
  }

  private async cargar(): Promise<void> {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Solicitud no encontrada.');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    try {
      const detalle = await this.solicitudesService.detalle(id);
      this.solicitud.set(detalle);
      await this.cargarOfertas(detalle);
      await this.cargarPago(detalle);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarOfertas(
    detalle: SolicitudDetalle,
  ): Promise<void> {
    if (
      !['PUBLICADA', 'CON_OFERTAS', 'PENDIENTE_PAGO'].includes(
        detalle.estado,
      )
    ) {
      this.ofertas.set([]);
      return;
    }

    this.cargandoOfertas.set(true);
    try {
      this.ofertas.set(
        await this.solicitudesService.ofertas(detalle.id),
      );
    } catch {
      this.ofertas.set([]);
    } finally {
      this.cargandoOfertas.set(false);
    }
  }

  private async cargarPago(
    detalle: SolicitudDetalle,
  ): Promise<void> {
    if (
      ![
        'PENDIENTE_PAGO',
        'CONFIRMADA',
        'EN_PROGRESO',
        'TERMINADA_TRABAJADOR',
        'FINALIZADA',
        'CANCELADA',
      ].includes(detalle.estado)
    ) {
      this.pago.set(null);
      return;
    }

    try {
      const resultado = await this.solicitudesService.pago(
        detalle.id,
      );
      this.pago.set(resultado.pago);
      if (resultado.pago.estado_qr === 'PENDIENTE') {
        this.iniciarContador();
      }
    } catch {
      this.pago.set(null);
    }
  }

  private iniciarContador(): void {
    this.detenerContador();
    this.actualizarContador();
    this.intervaloCodigo = setInterval(() => {
      this.actualizarContador();
      if (this.segundosQr() <= 0) {
        this.detenerContador();
      }
    }, 1000);
  }

  private actualizarContador(): void {
    const vence = this.pago()?.qr_vence_en;
    if (!vence) {
      this.segundosQr.set(0);
      return;
    }
    const restante = Math.max(
      0,
      Math.floor(
        (new Date(vence).getTime() - Date.now()) / 1000,
      ),
    );
    this.segundosQr.set(restante);
  }

  private detenerContador(): void {
    if (this.intervaloCodigo !== null) {
      clearInterval(this.intervaloCodigo);
      this.intervaloCodigo = null;
    }
  }
}
