import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  claseTonoRevision,
  claseTonoTrabajador,
  etiquetaDocumento,
  etiquetaEstadoRevision,
  etiquetaEstadoTrabajador,
  TIPOS_DOCUMENTO_REQUERIDOS,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import { formatearFecha } from '../../core/formato';
import type {
  DocumentoRevision,
  EstadoVerificacion,
  TipoDocumento,
} from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { VerificacionService } from '../../core/verificacion.service';

const MAX_ARCHIVO_BYTES = 5 * 1024 * 1024;
const TIPOS_ARCHIVO_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
]);

@Component({
  selector: 'app-verificacion-trabajador',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Trabajador</span>
            <h1>Verificación de identidad</h1>
            <p>
              Sube tus documentos para que un supervisor valide tu
              cuenta. Sin la verificación aprobada no podrás
              ofertar.
            </p>
          </div>
          <a
            routerLink="/trabajador"
            class="btn btn--contorno"
            >Volver al panel</a
          >
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando tu verificación…
          </div>
        } @else {
          @if (error()) {
            <div class="alerta alerta--error">
              <span>{{ error() }}</span>
            </div>
          }
          @if (exito()) {
            <div class="alerta alerta--exito">
              <span>{{ exito() }}</span>
            </div>
          }

          @if (estado(); as verificacion) {
            <div class="rejilla rejilla--2 seccion">
              <div class="tarjeta">
                <h2>Estado del expediente</h2>
                <div class="fila mt-1">
                  <span
                    class="insignia"
                    [class]="
                      'insignia ' +
                      claseTonoTrabajador(verificacion.estado)
                    "
                  >
                    {{
                      etiquetaEstadoTrabajador(
                        verificacion.estado
                      )
                    }}
                  </span>
                  <span class="etiqueta-suave">
                    Nivel {{ verificacion.nivel_verificacion }}
                  </span>
                  @if (verificacion.puede_ofertar) {
                    <span class="insignia insignia--verde"
                      >Habilitado para ofertar</span
                    >
                  }
                </div>

                <div class="pasos mt-2">
                  <span class="paso paso--hecho">
                    <span class="paso__numero">1</span> Cuenta
                    creada
                  </span>
                  <span
                    class="paso"
                    [class.paso--activo]="
                      verificacion.nivel_verificacion < 2
                    "
                    [class.paso--hecho]="
                      verificacion.nivel_verificacion >= 2
                    "
                  >
                    <span class="paso__numero">2</span>
                    Documentos
                  </span>
                  <span
                    class="paso"
                    [class.paso--activo]="
                      verificacion.nivel_verificacion >= 2
                    "
                  >
                    <span class="paso__numero">3</span>
                    Verificado
                  </span>
                </div>

                @if (
                  verificacion.antecedentes_vencidos
                ) {
                  <div class="alerta alerta--error">
                    <span>
                      Tus antecedentes penales están vencidos.
                      Sube un REJAP actualizado para recuperar la
                      habilitación.
                    </span>
                  </div>
                } @else if (
                  verificacion.antecedentes_por_vencer
                ) {
                  <div class="alerta alerta--aviso">
                    <span>
                      Tus antecedentes están por vencer
                      {{
                        verificacion.vence_antecedentes
                          ? '(' +
                            formatearFecha(
                              verificacion.vence_antecedentes
                            ) +
                            ')'
                          : ''
                      }}. Programa la renovación.
                    </span>
                  </div>
                }
                @if (
                  !verificacion.puede_ofertar &&
                  verificacion.motivo_bloqueo
                ) {
                  <p class="small muted">
                    {{ verificacion.motivo_bloqueo }}
                  </p>
                }

                <div class="mt-2">
                  <span class="etiqueta">Cuenta bancaria</span>
                  @if (verificacion.cuenta_bancaria?.registrada) {
                    <p class="small muted">
                      {{ verificacion.cuenta_bancaria?.banco }} ·
                      Titular:
                      {{ verificacion.cuenta_bancaria?.titular }}
                    </p>
                  } @else {
                    <p class="small muted">
                      Aún no registraste una cuenta bancaria.
                    </p>
                  }
                </div>
              </div>

              <div class="tarjeta">
                <h2>Documentos cargados</h2>
                @if (verificacion.documentos.length === 0) {
                  <p class="small muted">
                    Todavía no cargaste documentos.
                  </p>
                } @else {
                  <div class="pila mt-1">
                    @for (
                      documento of verificacion.documentos;
                      track documento.id
                    ) {
                      <div
                        class="tarjeta tarjeta--plana"
                      >
                        <div class="fila fila--separada">
                          <strong>{{
                            etiquetaDocumento(documento.tipo)
                          }}</strong>
                          <span
                            class="insignia"
                            [class]="
                              'insignia ' +
                              claseTonoRevision(
                                documento.estado
                              )
                            "
                          >
                            {{
                              etiquetaEstadoRevision(
                                documento.estado
                              )
                            }}
                          </span>
                        </div>
                        <div class="fila fila--separada mt-1">
                          <span class="tiny muted">
                            Cargado:
                            {{ formatearFecha(documento.fecha_carga) }}
                            @if (documento.vence_en) {
                              · Vence:
                              {{ formatearFecha(documento.vence_en) }}
                            }
                          </span>
                          @if (documento.archivo_privado_url) {
                            <button
                              type="button"
                              class="enlace-boton small"
                              (click)="verDocumento(documento)"
                            >
                              Ver archivo
                            </button>
                          }
                        </div>
                        @if (documento.motivo_rechazo) {
                          <p
                            class="tiny mt-1"
                            style="color: var(--rojo-700)"
                          >
                            {{ documento.motivo_rechazo }}
                          </p>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <div class="tarjeta">
            <h2>Cargar documentos</h2>
            <p class="small muted">
              Puedes reemplazar tus documentos cuando un supervisor
              los rechace o solicite datos nuevos. Los cinco
              documentos son obligatorios en cada envío.
            </p>

            <form
              class="formulario mt-2"
              [formGroup]="formulario"
              (ngSubmit)="enviar()"
            >
              <h3 class="mt-2">Cuenta bancaria</h3>
              <div class="formulario--rejilla">
                <div class="campo">
                  <label class="etiqueta" for="banco">Banco</label>
                  <input
                    id="banco"
                    type="text"
                    class="input"
                    formControlName="banco"
                    placeholder="Ej. Banco Unión"
                  />
                </div>
                <div class="campo">
                  <label class="etiqueta" for="cuenta"
                    >Número de cuenta</label
                  >
                  <input
                    id="cuenta"
                    type="text"
                    class="input"
                    formControlName="numero_cuenta"
                    placeholder="6 a 20 dígitos"
                  />
                </div>
                <div class="campo">
                  <label class="etiqueta" for="titular"
                    >Titular de la cuenta</label
                  >
                  <input
                    id="titular"
                    type="text"
                    class="input"
                    formControlName="titular"
                    placeholder="Nombre completo"
                  />
                </div>
                <div class="campo">
                  <label class="etiqueta" for="vence"
                    >Vencimiento del REJAP
                    <small>(opcional)</small></label
                  >
                  <input
                    id="vence"
                    type="date"
                    class="input"
                    formControlName="vence_antecedentes"
                  />
                </div>
              </div>

              <h3 class="mt-3">Documentos obligatorios</h3>
              <div class="rejilla rejilla--2 mt-2">
                @for (
                  tipo of tiposRequeridos;
                  track tipo
                ) {
                  <div class="campo">
                    <span class="etiqueta">{{
                      etiquetaDocumento(tipo)
                    }}</span>
                    <input
                      type="file"
                      class="input"
                      accept="image/jpeg,image/png,application/pdf"
                      (change)="seleccionarArchivo(tipo, $event)"
                    />
                    @if (archivos()[tipo]) {
                      <div class="fila fila--separada">
                        <span class="ayuda">
                          {{ archivos()[tipo]?.name }}
                        </span>
                        <button
                          type="button"
                          class="enlace-boton small"
                          (click)="quitarArchivo(tipo)"
                        >
                          Quitar
                        </button>
                      </div>
                    } @else {
                      <span class="ayuda">
                        JPG, PNG o PDF de hasta 5 MB.
                      </span>
                    }
                  </div>
                }
              </div>

              <button
                type="submit"
                class="btn btn--primario"
                [disabled]="enviando()"
              >
                {{
                  enviando()
                    ? 'Enviando documentos…'
                    : 'Enviar a revisión'
                }}
              </button>
            </form>
          </div>
        }
      </div>
    </section>
  `,
})
export class VerificacionTrabajador implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly verificacionService = inject(
    VerificacionService,
  );
  private readonly toast = inject(ToastService);

  protected readonly tiposRequeridos =
    TIPOS_DOCUMENTO_REQUERIDOS;
  protected readonly etiquetaDocumento = etiquetaDocumento;
  protected readonly etiquetaEstadoRevision =
    etiquetaEstadoRevision;
  protected readonly etiquetaEstadoTrabajador =
    etiquetaEstadoTrabajador;
  protected readonly claseTonoRevision = claseTonoRevision;
  protected readonly claseTonoTrabajador =
    claseTonoTrabajador;
  protected readonly formatearFecha = formatearFecha;

  protected readonly estado =
    signal<EstadoVerificacion | null>(null);
  protected readonly archivos = signal<
    Partial<Record<TipoDocumento, File>>
  >({});
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly exito = signal('');

  protected readonly faltantes = computed(() =>
    this.tiposRequeridos.filter((tipo) => !this.archivos()[tipo]),
  );

  protected readonly formulario = this.fb.group({
    banco: [''],
    numero_cuenta: [''],
    titular: [''],
    vence_antecedentes: [''],
  });

  ngOnInit(): void {
    void this.cargar();
  }

  protected seleccionarArchivo(
    tipo: TipoDocumento,
    evento: Event,
  ): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    if (!archivo) {
      return;
    }
    if (archivo.size > MAX_ARCHIVO_BYTES) {
      this.toast.error(
        `${archivo.name} supera el límite de 5 MB.`,
      );
      entrada.value = '';
      return;
    }
    if (!TIPOS_ARCHIVO_PERMITIDOS.has(archivo.type)) {
      this.toast.error(
        `${archivo.name} debe ser un archivo JPG, PNG o PDF.`,
      );
      entrada.value = '';
      return;
    }
    this.archivos.update((actuales) => ({
      ...actuales,
      [tipo]: archivo,
    }));
  }

  protected quitarArchivo(tipo: TipoDocumento): void {
    this.archivos.update((actuales) => {
      const copia = { ...actuales };
      delete copia[tipo];
      return copia;
    });
  }

  protected async enviar(): Promise<void> {
    this.error.set('');
    this.exito.set('');
    const valores = this.formulario.getRawValue();
    if (!valores.banco.trim()) {
      this.error.set('Indica el banco.');
      return;
    }
    if (!/^\d{6,20}$/.test(valores.numero_cuenta.trim())) {
      this.error.set(
        'El número de cuenta debe tener entre 6 y 20 dígitos.',
      );
      return;
    }
    if (!valores.titular.trim()) {
      this.error.set('Indica el titular de la cuenta.');
      return;
    }
    if (this.faltantes().length > 0) {
      this.error.set(
        `Faltan documentos: ${this.faltantes()
          .map((tipo) => etiquetaDocumento(tipo))
          .join(', ')}.`,
      );
      return;
    }
    this.enviando.set(true);
    try {
      const respuesta =
        await this.verificacionService.cargarDocumentos({
          banco: valores.banco.trim(),
          numero_cuenta: valores.numero_cuenta.trim(),
          titular: valores.titular.trim(),
          vence_antecedentes:
            valores.vence_antecedentes || undefined,
          archivos: this.archivos(),
        });
      this.exito.set(respuesta.mensaje);
      this.archivos.set({});
      this.toast.exito('Documentos enviados a revisión.');
      await this.cargar();
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.enviando.set(false);
    }
  }

  protected async verDocumento(
    documento: DocumentoRevision,
  ): Promise<void> {
    const perfilId = this.estado()?.perfil_id;
    if (!perfilId) {
      return;
    }
    try {
      const blob =
        await this.verificacionService.descargarDocumento(
          perfilId,
          documento.id,
        );
      const url = URL.createObjectURL(blob);
      const ventana = window.open(url, '_blank');
      if (!ventana) {
        this.toast.error(
          'Habilita las ventanas emergentes para ver el documento.',
        );
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      this.toast.error(mensajeDeError(error));
    }
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const estado = await this.verificacionService.estado();
      this.estado.set(estado);
      if (estado.cuenta_bancaria) {
        this.formulario.patchValue({
          banco: estado.cuenta_bancaria.banco ?? '',
          titular: estado.cuenta_bancaria.titular ?? '',
        });
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
