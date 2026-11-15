import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  claseTonoPago,
  claseTonoSolicitud,
  etiquetaEspecialidad,
  etiquetaEstadoDevolucion,
  etiquetaEstadoQr,
  etiquetaEstadoReclamo,
  etiquetaEstadoSolicitud,
  etiquetaTipoPrecio,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type {
  EstadoSolicitud,
  Pago,
  Precio,
  ReportePublico,
  ResolucionCancelacion,
  ResolucionPagoFinal,
  SolicitudDetalle,
} from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { PagosService } from '../../core/pagos.service';
import { SolicitudesService } from '../../core/solicitudes.service';
import { ToastService } from '../../core/toast.service';
import { UploadsService } from '../../core/uploads.service';
import {
  FechaHoraPipe,
  ImagenUrlPipe,
  MonedaPipe,
} from '../../shared/pipes';

const ESTADOS_CANCELABLES: EstadoSolicitud[] = [
  'PENDIENTE_PAGO',
  'CONFIRMADA',
  'EN_PROGRESO',
  'TERMINADA_TRABAJADOR',
];

@Component({
  selector: 'app-seguimiento',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FechaHoraPipe,
    ImagenUrlPipe,
    MonedaPipe,
  ],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <a [routerLink]="volverUrl()" class="migaja">
          ← {{ esTrabajador() ? 'Volver a mis ofertas' : 'Volver a mis solicitudes' }}
        </a>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando seguimiento…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else if (solicitud(); as detalle) {
          <div class="cabecera-pagina">
            <div>
              <span class="migaja">Seguimiento en vivo</span>
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
              </div>
              <p>
                {{
                  etiquetaEspecialidad(detalle.especialidad)
                }}
                · {{ detalle.zona?.nombre }}
              </p>
            </div>
            <div class="fila">
              <span class="small muted">
                Actualización automática cada 15 s
              </span>
              <button
                type="button"
                class="btn btn--contorno btn--sm"
                [disabled]="actualizando()"
                (click)="refrescar(false)"
              >
                {{
                  actualizando()
                    ? 'Actualizando…'
                    : 'Actualizar estado'
                }}
              </button>
            </div>
          </div>

          @if (errorAccion()) {
            <div class="alerta alerta--error mb-2">
              <span>{{ errorAccion() }}</span>
            </div>
          }

          @if (resultadoCancelacion(); as resultado) {
            <div class="alerta alerta--aviso mb-2">
              <span>
                Solicitud {{ etiquetaEstado(resultado.solicitud.estado) }}.
                @if (resultado.devolucion) {
                  Devolución de
                  {{ resultado.devolucion.monto | moneda }}
                  registrada con estado
                  {{ etiquetaEstadoDevolucion(resultado.devolucion.estado) }}.
                }
                @if (resultado.suspension) {
                  Se aplicó una suspensión de
                  {{ resultado.suspension.dias_fibonacci }}
                  día(s) al técnico.
                }
              </span>
            </div>
          }

          @if (reporte(); as rep) {
            <div class="alerta alerta--aviso mb-2">
              <span>
                <strong>{{ etiquetaEstadoReclamo(rep.estado) }}.</strong>
                El saldo del 75% queda bloqueado hasta que un
                supervisor resuelva el reclamo. La transferencia
                al técnico no se realizará mientras el reclamo
                siga abierto.
              </span>
            </div>
          }

          <div class="rejilla rejilla--2">
            <div class="pila">
              <div class="tarjeta">
                <h2>Dirección y contacto</h2>
                @if (detalle.whatsapp_url) {
                  <p class="mt-1">
                    <strong>{{ detalle.direccion_oculta }}</strong>
                  </p>
                  <a
                    class="btn btn--primario btn--bloque mt-2"
                    [href]="detalle.whatsapp_url"
                    target="_blank"
                    rel="noopener"
                  >
                    Contactar por WhatsApp
                  </a>
                } @else {
                  <div class="alerta alerta--aviso mt-2">
                    <span>
                      La dirección exacta y el WhatsApp se
                      habilitan cuando el pago del 25% se
                      confirme (RN11).
                    </span>
                  </div>
                }
              </div>

              @if (pago(); as pagoActual) {
                <div class="tarjeta">
                  <div class="fila fila--separada fila--arriba">
                    <h2 style="margin:0">Pago del 25%</h2>
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

                  <div class="rejilla rejilla--2 mt-2">
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
                        >Saldo en persona (75%)</span
                      >
                      <strong>{{
                        pagoActual.saldo_75 | moneda
                      }}</strong>
                    </div>
                  </div>

                  <div class="pila mt-2">
                    <div class="fila fila--separada">
                      <span class="muted">Pago inicial (25%)</span>
                      <strong>{{
                        pagoActual.pago_inicial_25 | moneda
                      }}</strong>
                    </div>
                    <div class="fila fila--separada">
                      <span class="muted"
                        >Comisión de la plataforma (5%)</span
                      >
                      <strong>{{
                        pagoActual.comision_5 | moneda
                      }}</strong>
                    </div>
                    <div class="fila fila--separada">
                      <span class="muted"
                        >Parte del técnico (20%)</span
                      >
                      <strong>{{
                        pagoActual.parte_trabajador_20 | moneda
                      }}</strong>
                    </div>
                    <div class="fila fila--separada">
                      <span class="muted"
                        >Cliente marcó "Ya pagué"</span
                      >
                      <strong>{{
                        pagoActual.ya_pague_cliente
                          ? 'Sí'
                          : 'Todavía no'
                      }}</strong>
                    </div>
                    <div class="fila fila--separada">
                      <span class="muted"
                        >Técnico confirmó el saldo</span
                      >
                      <strong>{{
                        pagoActual.saldo_75_confirmado_trabajador
                          ? 'Sí'
                          : 'Todavía no'
                      }}</strong>
                    </div>
                  </div>

                  @if (pagoActual.transferido_al_trabajador) {
                    <div class="alerta alerta--exito mt-2">
                      <span>
                        Transferencia simulada realizada al
                        técnico.
                        @if (
                          pagoActual.comprobante_transferencia
                        ) {
                          Comprobante:
                          {{
                            pagoActual.comprobante_transferencia
                          }}.
                        }
                      </span>
                    </div>
                  }
                </div>
              }

              <div class="tarjeta">
                <h2>Precio final</h2>
                @if (precioFinal(); as precio) {
                  <div class="fila fila--separada mt-2">
                    <div>
                      <strong>{{
                        precio.monto | moneda
                      }}</strong>
                      <p class="small muted" style="margin:0">
                        {{ etiquetaTipoPrecio(precio.tipo) }} ·
                        {{ precio.fecha | fechaHora }}
                      </p>
                    </div>
                    <span
                      class="insignia"
                      [class]="
                        'insignia ' +
                        claseTonoPrecio(precio.aprobado_cliente)
                      "
                    >
                      {{ etiquetaAprobacion(precio.aprobado_cliente) }}
                    </span>
                  </div>

                  @if (puedeResponderPrecioFinal()) {
                    <div class="alerta alerta--info mt-2">
                      <span>
                        El técnico registró el precio final. Si lo
                        apruebas, la solicitud pasa a "En progreso"
                        y el saldo del 75% se recalcula.
                      </span>
                    </div>
                    <div class="fila mt-2">
                      <button
                        type="button"
                        class="btn btn--primario"
                        [disabled]="procesando()"
                        (click)="responderPrecioFinal(true)"
                      >
                        Aprobar precio final
                      </button>
                      <button
                        type="button"
                        class="btn btn--peligro"
                        [disabled]="procesando()"
                        (click)="responderPrecioFinal(false)"
                      >
                        Rechazar y cancelar
                      </button>
                    </div>
                    <p class="small muted mt-1">
                      Si rechazas, la solicitud se anula y se
                      registra la devolución del pago inicial.
                    </p>
                  }
                } @else if (puedeRegistrarPrecioFinal()) {
                  <p class="small muted mt-1">
                    Registra el monto definitivo tras la visita.
                    Viene precargado con el precio acordado en la
                    oferta; ajústalo solo si cambió.
                  </p>
                  <form
                    class="formulario mt-2"
                    [formGroup]="formPrecioFinal"
                    (ngSubmit)="registrarPrecioFinal()"
                  >
                    <div class="campo">
                      <label class="etiqueta" for="montoFinal"
                        >Precio final (Bs)</label
                      >
                      <input
                        id="montoFinal"
                        type="number"
                        class="input"
                        min="0.5"
                        step="0.5"
                        formControlName="monto"
                      />
                    </div>
                    <button
                      type="submit"
                      class="btn btn--primario btn--bloque mt-2"
                      [disabled]="
                        formPrecioFinal.invalid || procesando()
                      "
                    >
                      {{ procesando() ? 'Guardando…' : 'Registrar precio final' }}
                    </button>
                  </form>
                } @else {
                  <p class="small muted mt-1">
                    @if (esTrabajador()) {
                      El precio final se habilita cuando el pago
                      del 25% esté confirmado.
                    } @else {
                      El técnico registrará el precio final después
                      de la visita.
                    }
                  </p>
                }
              </div>

              <div class="tarjeta">
                <div class="fila fila--separada fila--arriba">
                  <h2 style="margin:0">Incrementos</h2>
                  @if (puedeRegistrarIncremento()) {
                    <button
                      type="button"
                      class="btn btn--ambar btn--sm"
                      (click)="abrirIncremento()"
                    >
                      Registrar incremento
                    </button>
                  }
                </div>

                @if (incrementos().length === 0) {
                  <p class="small muted mt-2">
                    No hay incrementos registrados.
                  </p>
                } @else {
                  <div class="pila mt-2">
                    @for (
                      incremento of incrementos();
                      track incremento.id
                    ) {
                      <div
                        class="tarjeta tarjeta--plana"
                        style="padding: 0.85rem"
                      >
                        <div class="fila fila--separada">
                          <strong>{{
                            incremento.monto | moneda
                          }}</strong>
                          <span
                            class="insignia"
                            [class]="
                              'insignia ' +
                              claseTonoPrecio(
                                incremento.aprobado_cliente
                              )
                            "
                          >
                            {{
                              etiquetaAprobacion(
                                incremento.aprobado_cliente
                              )
                            }}
                          </span>
                        </div>
                        <p class="small mt-1">
                          {{ incremento.motivo }}
                        </p>
                        @if (incremento.foto_evidencia_url) {
                          <a
                            class="small"
                            [href]="
                              incremento.foto_evidencia_url
                                | imagenUrl
                            "
                            target="_blank"
                            rel="noopener"
                            >Ver foto de evidencia</a
                          >
                        }
                        @if (
                          esCliente() &&
                          incremento.aprobado_cliente === null &&
                          detalle.estado === 'EN_PROGRESO'
                        ) {
                          <div class="fila mt-2">
                            <button
                              type="button"
                              class="btn btn--primario btn--sm"
                              [disabled]="procesando()"
                              (click)="
                                responderIncremento(
                                  incremento,
                                  true
                                )
                              "
                            >
                              Aprobar
                            </button>
                            <button
                              type="button"
                              class="btn btn--peligro btn--sm"
                              [disabled]="procesando()"
                              (click)="
                                responderIncremento(
                                  incremento,
                                  false
                                )
                              "
                            >
                              Rechazar
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
                @if (esCliente() && hayIncrementoPendiente()) {
                  <p class="small muted mt-2">
                    Si rechazas un incremento, la solicitud se
                    anula y se registra la devolución del pago
                    inicial.
                  </p>
                }
              </div>

              <div class="tarjeta">
                <h2>Marcar terminado y cobro</h2>

                @if (detalle.estado === 'FINALIZADA') {
                  <div class="alerta alerta--exito mt-2">
                    <span>
                      Servicio finalizado. El pago del 25% fue
                      conciliado y la parte del técnico quedó
                      transferida.
                    </span>
                  </div>
                } @else if (
                  detalle.estado === 'TERMINADA_TRABAJADOR'
                ) {
                  @if (esCliente()) {
                    @if (puedeYaPague()) {
                      <p class="small muted mt-1">
                        El técnico marcó el trabajo como terminado.
                        Confirma que le pagaste el 75% en persona.
                      </p>
                      <button
                        type="button"
                        class="btn btn--primario btn--bloque mt-2"
                        [disabled]="procesando()"
                        (click)="marcarYaPague()"
                      >
                        Ya pagué el 75%
                      </button>
                    } @else {
                      <div class="alerta alerta--info mt-2">
                        <span>
                          Marcaste "Ya pagué". Falta que el técnico
                          confirme el cobro o que se cumplan las
                          48 horas para el cierre automático.
                        </span>
                      </div>
                    }
                  } @else {
                    @if (puedeConfirmarCobro()) {
                      <p class="small muted mt-1">
                        Confirma si recibiste el saldo del 75% en
                        persona. Si no lo recibiste, reporta el
                        impago para que un supervisor revise el
                        caso.
                      </p>
                      <div class="fila mt-2">
                        <button
                          type="button"
                          class="btn btn--primario"
                          [disabled]="procesando()"
                          (click)="confirmarCobro()"
                        >
                          Confirmar cobro
                        </button>
                        <button
                          type="button"
                          class="btn btn--peligro"
                          [disabled]="procesando()"
                          (click)="abrirImpago()"
                        >
                          Reportar impago
                        </button>
                      </div>
                    } @else {
                      <div class="alerta alerta--info mt-2">
                        <span>
                          Ya confirmaste el saldo. La solicitud se
                          cerrará cuando el cliente marque "Ya
                          pagué" o al cumplirse las 48 horas.
                        </span>
                      </div>
                    }
                  }
                } @else if (detalle.estado === 'EN_PROGRESO') {
                  @if (esTrabajador()) {
                    <p class="small muted mt-1">
                      Cuando termines el trabajo, márcalo para que
                      el cliente pueda confirmar el pago del 75%.
                    </p>
                    <button
                      type="button"
                      class="btn btn--ambar btn--bloque mt-2"
                      [disabled]="procesando()"
                      (click)="marcarTerminado()"
                    >
                      Trabajo terminado
                    </button>
                  } @else {
                    <div class="alerta alerta--info mt-2">
                      <span>
                        El trabajo está en progreso. El técnico lo
                        marcará como terminado al finalizar.
                      </span>
                    </div>
                  }
                } @else if (detalle.estado === 'CONFIRMADA') {
                  <div class="alerta alerta--info mt-2">
                    <span>
                      Pago inicial confirmado. El técnico debe
                      registrar el precio final tras la visita
                      para iniciar el trabajo.
                    </span>
                  </div>
                } @else if (
                  detalle.estado === 'CANCELADA' ||
                  detalle.estado === 'ANULADA'
                ) {
                  <div class="alerta alerta--aviso mt-2">
                    <span>
                      La solicitud ya no está activa. Revisa el
                      historial para conocer el detalle.
                    </span>
                  </div>
                }
              </div>

              @if (puedeCancelar()) {
                <div class="tarjeta">
                  <h2>Cancelar solicitud</h2>
                  <p class="small muted mt-1">
                    Cancela solo si no puedes continuar con el
                    servicio. Se aplican las reglas de aviso de 2
                    horas, devoluciones y suspensión por
                    incumplimiento.
                  </p>
                  <button
                    type="button"
                    class="btn btn--peligro btn--bloque mt-2"
                    [disabled]="procesando()"
                    (click)="abrirCancelacion()"
                  >
                    Cancelar solicitud
                  </button>
                </div>
              }
            </div>

            <div class="pila">
              <div class="tarjeta">
                <div class="fila fila--separada">
                  <h2 style="margin:0">Historial de estados</h2>
                  @if (actualizando()) {
                    <span class="girador"></span>
                  }
                </div>
                @if (detalle.historial.length === 0) {
                  <p class="small muted mt-2">
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
                          {{ evento.fecha_hora | fechaHora }}
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
                <h2>Resumen</h2>
                <div class="pila mt-2">
                  <div class="fila fila--separada">
                    <span class="muted">Cliente</span>
                    <strong>{{
                      detalle.cliente_id ===
                      usuarioId()
                        ? 'Tú'
                        : 'Cliente'
                    }}</strong>
                  </div>
                  <div class="fila fila--separada">
                    <span class="muted">Técnico</span>
                    <strong>{{
                      detalle.trabajador_confirmado_id
                        ? 'Asignado'
                        : 'Pendiente'
                    }}</strong>
                  </div>
                  <div class="fila fila--separada">
                    <span class="muted">Cita preferida</span>
                    <strong>{{
                      detalle.fecha_cita_preferida | fechaHora
                    }}</strong>
                  </div>
                  <div class="fila fila--separada">
                    <span class="muted">Urgente</span>
                    <strong>{{
                      detalle.urgente ? 'Sí (+10%)' : 'No'
                    }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </section>

    @if (mostrarCancelacion()) {
      <div class="modal-fondo" (click)="cerrarCancelacion()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="fila fila--separada">
            <h2 style="margin:0">Cancelar solicitud</h2>
            <button
              type="button"
              class="enlace-boton"
              (click)="cerrarCancelacion()"
            >
              Cerrar
            </button>
          </div>
          <p class="small muted">
            Indica el motivo. Si cancelas con menos de 2 horas
            de aviso, puede aplicarse una penalidad y una
            suspensión al técnico.
          </p>

          <form
            class="formulario mt-2"
            [formGroup]="formCancelar"
            (ngSubmit)="cancelarSolicitud()"
          >
            <div class="campo">
              <label class="etiqueta" for="motivoCancelar"
                >Motivo</label
              >
              <textarea
                id="motivoCancelar"
                class="input"
                rows="3"
                formControlName="motivo"
              ></textarea>
            </div>
            <button
              type="submit"
              class="btn btn--peligro btn--bloque mt-2"
              [disabled]="
                formCancelar.invalid || procesando()
              "
            >
              {{ procesando() ? 'Cancelando…' : 'Confirmar cancelación' }}
            </button>
          </form>
        </div>
      </div>
    }

    @if (mostrarIncremento()) {
      <div class="modal-fondo" (click)="cerrarIncremento()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="fila fila--separada">
            <h2 style="margin:0">Registrar incremento</h2>
            <button
              type="button"
              class="enlace-boton"
              (click)="cerrarIncremento()"
            >
              Cerrar
            </button>
          </div>
          <p class="small muted">
            El cliente debe aprobar el incremento. Si lo
            rechaza, la solicitud se anula y se devuelve el pago
            inicial.
          </p>

          <form
            class="formulario mt-2"
            [formGroup]="formIncremento"
            (ngSubmit)="registrarIncremento()"
          >
            <div class="campo">
              <label class="etiqueta" for="montoIncremento"
                >Monto (Bs)</label
              >
              <input
                id="montoIncremento"
                type="number"
                class="input"
                min="0.5"
                step="0.5"
                formControlName="monto"
              />
            </div>
            <div class="campo">
              <label class="etiqueta" for="motivoIncremento"
                >Motivo</label
              >
              <textarea
                id="motivoIncremento"
                class="input"
                rows="3"
                formControlName="motivo"
              ></textarea>
            </div>
            <div class="campo">
              <label class="etiqueta" for="evidencia"
                >Foto de evidencia</label
              >
              <input
                id="evidencia"
                type="file"
                class="input"
                accept="image/*"
                (change)="seleccionarEvidencia($event)"
              />
            </div>
            <button
              type="submit"
              class="btn btn--ambar btn--bloque mt-2"
              [disabled]="
                formIncremento.invalid || procesando()
              "
            >
              {{
                procesando()
                  ? 'Enviando…'
                  : 'Enviar incremento al cliente'
              }}
            </button>
          </form>
        </div>
      </div>
    }

    @if (mostrarImpago()) {
      <div class="modal-fondo" (click)="cerrarImpago()">
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="fila fila--separada">
            <h2 style="margin:0">Reportar impago</h2>
            <button
              type="button"
              class="enlace-boton"
              (click)="cerrarImpago()"
            >
              Cerrar
            </button>
          </div>
          <p class="small muted">
            El reclamo queda en revisión por un supervisor y el
            saldo del 75% no se transfiere mientras siga
            abierto.
          </p>

          <form
            class="formulario mt-2"
            [formGroup]="formImpago"
            (ngSubmit)="reportarImpago()"
          >
            <div class="campo">
              <label class="etiqueta" for="motivoImpago"
                >Motivo del impago</label
              >
              <textarea
                id="motivoImpago"
                class="input"
                rows="3"
                formControlName="motivo"
              ></textarea>
            </div>
            <button
              type="submit"
              class="btn btn--peligro btn--bloque mt-2"
              [disabled]="formImpago.invalid || procesando()"
            >
              {{
                procesando()
                  ? 'Enviando…'
                  : 'Reportar y abrir reclamo'
              }}
            </button>
          </form>
        </div>
      </div>
    }
  `,
})
export class Seguimiento implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly solicitudesService = inject(
    SolicitudesService,
  );
  private readonly pagosService = inject(PagosService);
  private readonly uploadsService = inject(UploadsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  protected readonly solicitud =
    signal<SolicitudDetalle | null>(null);
  protected readonly pago = signal<Pago | null>(null);
  protected readonly precios = signal<Precio[]>([]);
  protected readonly reporte = signal<ReportePublico | null>(
    null,
  );
  protected readonly cargando = signal(true);
  protected readonly actualizando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly error = signal('');
  protected readonly errorAccion = signal('');
  protected readonly mostrarCancelacion = signal(false);
  protected readonly mostrarIncremento = signal(false);
  protected readonly mostrarImpago = signal(false);
  protected readonly archivoEvidencia = signal<File | null>(
    null,
  );
  protected readonly resultadoCancelacion =
    signal<ResolucionCancelacion | null>(null);

  protected readonly etiquetaEstado = etiquetaEstadoSolicitud;
  protected readonly etiquetaEstadoQr = etiquetaEstadoQr;
  protected readonly etiquetaEstadoDevolucion =
    etiquetaEstadoDevolucion;
  protected readonly etiquetaEstadoReclamo =
    etiquetaEstadoReclamo;
  protected readonly etiquetaEspecialidad =
    etiquetaEspecialidad;
  protected readonly etiquetaTipoPrecio = etiquetaTipoPrecio;
  protected readonly claseTono = claseTonoSolicitud;
  protected readonly claseTonoPago = claseTonoPago;

  protected readonly formPrecioFinal = this.fb.nonNullable.group(
    {
      monto: [
        0,
        [Validators.required, Validators.min(0.5)],
      ],
    },
  );

  protected readonly formIncremento =
    this.fb.nonNullable.group({
      monto: [
        0,
        [Validators.required, Validators.min(0.5)],
      ],
      motivo: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(500),
        ],
      ],
    });

  protected readonly formImpago = this.fb.nonNullable.group({
    motivo: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(500),
      ],
    ],
  });

  protected readonly formCancelar = this.fb.nonNullable.group({
    motivo: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(500),
      ],
    ],
  });

  private intervaloCodigo: ReturnType<typeof setInterval> | null =
    null;
  private refrescando = false;

  protected readonly usuarioId = computed(
    () => this.auth.usuario()?.id ?? '',
  );

  protected readonly esTrabajador = computed(
    () => this.auth.rolActivo() === 'TRABAJADOR',
  );

  protected readonly esCliente = computed(
    () => this.auth.rolActivo() === 'CLIENTE',
  );

  protected readonly volverUrl = computed(() =>
    this.esTrabajador()
      ? '/trabajador/mis-ofertas'
      : '/cliente/mis-solicitudes',
  );

  protected readonly precioFinal = computed(
    () =>
      this.precios().find(
        (precio) => precio.tipo === 'FINAL',
      ) ?? null,
  );

  protected readonly incrementos = computed(() =>
    this.precios().filter(
      (precio) => precio.tipo === 'INCREMENTO',
    ),
  );

  protected readonly hayIncrementoPendiente = computed(() =>
    this.incrementos().some(
      (incremento) => incremento.aprobado_cliente === null,
    ),
  );

  protected readonly puedeRegistrarPrecioFinal = computed(
    () =>
      this.esTrabajador() &&
      this.solicitud()?.estado === 'CONFIRMADA' &&
      this.precioFinal() === null,
  );

  protected readonly puedeResponderPrecioFinal = computed(
    () =>
      this.esCliente() &&
      this.solicitud()?.estado === 'CONFIRMADA' &&
      this.precioFinal()?.aprobado_cliente === null,
  );

  protected readonly puedeRegistrarIncremento = computed(
    () =>
      this.esTrabajador() &&
      this.solicitud()?.estado === 'EN_PROGRESO',
  );

  protected readonly puedeYaPague = computed(
    () =>
      this.esCliente() &&
      this.solicitud()?.estado === 'TERMINADA_TRABAJADOR' &&
      this.pago() !== null &&
      !this.pago()?.ya_pague_cliente,
  );

  protected readonly puedeConfirmarCobro = computed(
    () =>
      this.esTrabajador() &&
      this.solicitud()?.estado === 'TERMINADA_TRABAJADOR' &&
      this.pago() !== null &&
      !this.pago()?.saldo_75_confirmado_trabajador,
  );

  protected readonly puedeCancelar = computed(() =>
    ESTADOS_CANCELABLES.includes(
      (this.solicitud()?.estado ?? '') as EstadoSolicitud,
    ),
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.detenerPolling());
  }

  ngOnInit(): void {
    void this.cargar().finally(() => this.iniciarPolling());
  }

  protected etiquetaAprobacion(
    aprobado: boolean | null,
  ): string {
    if (aprobado === null) {
      return 'Pendiente';
    }
    return aprobado ? 'Aprobado' : 'Rechazado';
  }

  protected claseTonoPrecio(
    aprobado: boolean | null,
  ): string {
    if (aprobado === null) {
      return 'insignia--ambar';
    }
    return aprobado ? 'insignia--verde' : 'insignia--rojo';
  }

  protected async refrescar(silencioso = false): Promise<void> {
    if (this.refrescando) {
      return;
    }
    this.refrescando = true;
    if (!silencioso) {
      this.actualizando.set(true);
    }

    const id = this.ruta.snapshot.paramMap.get('id');
    try {
      if (!id) {
        throw new Error('Solicitud no encontrada.');
      }
      const detalle = await this.solicitudesService.detalle(id);
      const [pagoResultado, preciosResultado] = await Promise.all([
        this.solicitudesService
          .pago(id)
          .catch(() => undefined),
        this.solicitudesService
          .precios(id)
          .catch(() => undefined),
      ]);

      this.solicitud.set(detalle);
      if (pagoResultado !== undefined) {
        this.pago.set(pagoResultado.pago);
        this.reporte.set(pagoResultado.reporte_abierto);
      }
      if (preciosResultado !== undefined) {
        this.precios.set(preciosResultado);
      }
      this.error.set('');
      this.precargarPrecioFinal();
    } catch (error) {
      if (!silencioso) {
        this.error.set(mensajeDeError(error));
      }
    } finally {
      this.refrescando = false;
      if (!silencioso) {
        this.actualizando.set(false);
      }
    }
  }

  protected async registrarPrecioFinal(): Promise<void> {
    if (this.formPrecioFinal.invalid) {
      this.errorAccion.set('Ingresa un monto válido.');
      return;
    }
    const id = this.solicitud()?.id;
    if (!id) {
      return;
    }

    await this.ejecutar(
      () =>
        this.solicitudesService.registrarPrecioFinal(id, {
          monto: this.formPrecioFinal.getRawValue().monto,
        }),
      'Precio final registrado. El cliente debe aprobarlo.',
    );
  }

  protected async responderPrecioFinal(
    aprobado: boolean,
  ): Promise<void> {
    const id = this.solicitud()?.id;
    if (!id) {
      return;
    }

    await this.ejecutar(
      () =>
        this.solicitudesService.responderPrecioFinal(
          id,
          aprobado,
        ),
      aprobado
        ? 'Precio final aprobado. La solicitud pasó a en progreso.'
        : 'Precio final rechazado. La solicitud fue anulada y se registró la devolución.',
    );
  }

  protected abrirIncremento(): void {
    this.errorAccion.set('');
    this.formIncremento.reset({
      monto: 0,
      motivo: '',
    });
    this.archivoEvidencia.set(null);
    this.mostrarIncremento.set(true);
  }

  protected cerrarIncremento(): void {
    if (!this.procesando()) {
      this.mostrarIncremento.set(false);
    }
  }

  protected seleccionarEvidencia(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoEvidencia.set(input.files?.[0] ?? null);
  }

  protected async registrarIncremento(): Promise<void> {
    const id = this.solicitud()?.id;
    const archivo = this.archivoEvidencia();
    if (!id) {
      return;
    }
    if (this.formIncremento.invalid) {
      this.errorAccion.set('Completa el monto y el motivo.');
      return;
    }
    if (!archivo) {
      this.errorAccion.set(
        'Adjunta una foto de evidencia para el incremento.',
      );
      return;
    }

    this.procesando.set(true);
    this.errorAccion.set('');
    try {
      const url = await this.uploadsService.subirImagen(archivo);
      const datos = this.formIncremento.getRawValue();
      await this.solicitudesService.registrarIncremento(id, {
        monto: datos.monto,
        motivo: datos.motivo,
        foto_evidencia_url: url,
      });
      this.mostrarIncremento.set(false);
      this.toast.exito(
        'Incremento enviado. El cliente debe aprobarlo.',
      );
      await this.refrescar(true);
    } catch (error) {
      this.errorAccion.set(mensajeDeError(error));
    } finally {
      this.procesando.set(false);
    }
  }

  protected async responderIncremento(
    incremento: Precio,
    aprobado: boolean,
  ): Promise<void> {
    const id = this.solicitud()?.id;
    if (!id) {
      return;
    }

    await this.ejecutar(
      () =>
        this.solicitudesService.responderIncremento(
          id,
          incremento.id,
          aprobado,
        ),
      aprobado
        ? 'Incremento aprobado. El saldo del 75% fue actualizado.'
        : 'Incremento rechazado. La solicitud fue anulada y se registró la devolución.',
    );
  }

  protected async marcarTerminado(): Promise<void> {
    const id = this.solicitud()?.id;
    if (!id) {
      return;
    }

    await this.ejecutar(
      () => this.solicitudesService.terminar(id),
      'Trabajo marcado como terminado. El cliente puede confirmar el pago del 75%.',
    );
  }

  protected async marcarYaPague(): Promise<void> {
    const pago = this.pago();
    if (!pago) {
      return;
    }

    await this.ejecutar(async () => {
      const resultado = await this.pagosService.marcarYaPague(
        pago.id,
      );
      this.aplicarResolucionPago(resultado);
    }, 'Marcaste "Ya pagué". Queda pendiente la confirmación del técnico.');
  }

  protected async confirmarCobro(): Promise<void> {
    const pago = this.pago();
    if (!pago) {
      return;
    }

    await this.ejecutar(async () => {
      const resultado =
        await this.pagosService.confirmarPago75(
          pago.id,
          true,
        );
      this.aplicarResolucionPago(resultado);
    }, 'Cobro confirmado. La solicitud se cerró o quedó a la espera del cierre automático.');
  }

  protected abrirImpago(): void {
    this.errorAccion.set('');
    this.formImpago.reset({ motivo: '' });
    this.mostrarImpago.set(true);
  }

  protected cerrarImpago(): void {
    if (!this.procesando()) {
      this.mostrarImpago.set(false);
    }
  }

  protected async reportarImpago(): Promise<void> {
    const pago = this.pago();
    if (!pago || this.formImpago.invalid) {
      this.errorAccion.set('Describe el motivo del impago.');
      return;
    }

    this.procesando.set(true);
    this.errorAccion.set('');
    try {
      const resultado =
        await this.pagosService.confirmarPago75(
          pago.id,
          false,
          this.formImpago.getRawValue().motivo,
        );
      this.aplicarResolucionPago(resultado);
      this.mostrarImpago.set(false);
      this.toast.info(
        'Reclamo abierto. En revisión por supervisor.',
      );
      await this.refrescar(true);
    } catch (error) {
      this.errorAccion.set(mensajeDeError(error));
    } finally {
      this.procesando.set(false);
    }
  }

  protected abrirCancelacion(): void {
    this.errorAccion.set('');
    this.formCancelar.reset({ motivo: '' });
    this.mostrarCancelacion.set(true);
  }

  protected cerrarCancelacion(): void {
    if (!this.procesando()) {
      this.mostrarCancelacion.set(false);
    }
  }

  protected async cancelarSolicitud(): Promise<void> {
    const id = this.solicitud()?.id;
    if (!id || this.formCancelar.invalid) {
      this.errorAccion.set('Indica el motivo de la cancelación.');
      return;
    }

    this.procesando.set(true);
    this.errorAccion.set('');
    try {
      const resultado =
        await this.solicitudesService.cancelar(
          id,
          this.formCancelar.getRawValue().motivo,
        );
      this.resultadoCancelacion.set(resultado);
      this.mostrarCancelacion.set(false);
      this.toast.exito('Solicitud cancelada.');
      await this.refrescar(true);
    } catch (error) {
      this.errorAccion.set(mensajeDeError(error));
    } finally {
      this.procesando.set(false);
    }
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    await this.refrescar(false);
    this.cargando.set(false);
  }

  private aplicarResolucionPago(
    resultado: ResolucionPagoFinal,
  ): void {
    this.pago.set(resultado.pago);
    this.reporte.set(resultado.reporte);
  }

  private precargarPrecioFinal(): void {
    if (!this.puedeRegistrarPrecioFinal()) {
      return;
    }
    const actual = this.formPrecioFinal.getRawValue().monto;
    if (actual > 0) {
      return;
    }
    const sugerido =
      this.pago()?.precio_total_acordado ?? 0;
    if (sugerido > 0) {
      this.formPrecioFinal.patchValue({ monto: sugerido });
    }
  }

  private async ejecutar(
    accion: () => Promise<unknown>,
    mensajeExito: string,
  ): Promise<void> {
    this.procesando.set(true);
    this.errorAccion.set('');
    try {
      await accion();
      this.toast.exito(mensajeExito);
      await this.refrescar(true);
    } catch (error) {
      this.errorAccion.set(mensajeDeError(error));
    } finally {
      this.procesando.set(false);
    }
  }

  private iniciarPolling(): void {
    this.detenerPolling();
    this.intervaloCodigo = setInterval(() => {
      void this.refrescar(true);
    }, 15_000);
  }

  private detenerPolling(): void {
    if (this.intervaloCodigo !== null) {
      clearInterval(this.intervaloCodigo);
      this.intervaloCodigo = null;
    }
  }
}
