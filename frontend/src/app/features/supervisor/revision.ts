import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  claseTonoRevision,
  claseTonoTrabajador,
  etiquetaDocumento,
  etiquetaEstadoRevision,
  etiquetaEstadoTrabajador,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import { formatearFecha } from '../../core/formato';
import type {
  DecisionRevision,
  DocumentoRevision,
  ExpedienteVerificacion,
} from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { VerificacionService } from '../../core/verificacion.service';

@Component({
  selector: 'app-revision-verificacion',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <a
          routerLink="/supervisor/verificaciones"
          class="migaja"
          >← Volver a la bandeja</a
        >

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando expediente…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else if (expediente(); as datos) {
          <div class="cabecera-pagina">
            <div>
              <h1>{{ datos.nombre_completo }}</h1>
              <p>
                {{ datos.telefono }} · Nivel
                {{ datos.nivel_verificacion }} ·
                {{ datos.horas_en_espera }} h en espera
              </p>
            </div>
            <div class="fila">
              @if (datos.mas_de_48_horas) {
                <span class="insignia insignia--rojo"
                  >Más de 48 horas</span
                >
              }
              <span
                class="insignia"
                [class]="
                  'insignia ' +
                  claseTonoTrabajador(datos.estado)
                "
              >
                {{ etiquetaEstadoTrabajador(datos.estado) }}
              </span>
            </div>
          </div>

          <div class="rejilla rejilla--2">
            <div class="pila">
              <div class="tarjeta">
                <h2>Documentos del expediente</h2>
                <div class="pila mt-1">
                  @for (
                    documento of datos.documentos;
                    track documento.id
                  ) {
                    <div class="tarjeta tarjeta--plana">
                      <div class="fila fila--separada">
                        <strong>{{
                          etiquetaDocumento(documento.tipo)
                        }}</strong>
                        <span
                          class="insignia"
                          [class]="
                            'insignia ' +
                            claseTonoRevision(documento.estado)
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
              </div>

              <div class="tarjeta">
                <h2>Cuenta bancaria</h2>
                @if (datos.cuenta_bancaria) {
                  <p class="small muted">
                    {{ datos.cuenta_bancaria.banco }} · Titular:
                    {{ datos.cuenta_bancaria.titular }}
                  </p>
                } @else {
                  <p class="small muted">
                    El trabajador no registró cuenta bancaria.
                  </p>
                }
                @if (datos.vence_antecedentes) {
                  <p class="small muted">
                    REJAP vence el
                    {{ formatearFecha(datos.vence_antecedentes) }}.
                  </p>
                }
              </div>
            </div>

            <div class="tarjeta">
              <h2>Decisión de revisión</h2>
              <form
                class="formulario mt-2"
                [formGroup]="formulario"
                (ngSubmit)="revisar()"
              >
                <div class="campo">
                  <label class="etiqueta" for="decision"
                    >Decisión</label
                  >
                  <select
                    id="decision"
                    class="select"
                    formControlName="decision"
                  >
                    <option value="APROBAR">Aprobar</option>
                    <option value="REQUIERE_DATOS">
                      Solicitar datos adicionales
                    </option>
                    <option value="RECHAZAR">Rechazar</option>
                  </select>
                </div>

                @if (
                  formulario.controls.decision.value ===
                  'APROBAR'
                ) {
                  <div class="campo">
                    <label class="etiqueta" for="nivel"
                      >Nivel de verificación</label
                    >
                    <select
                      id="nivel"
                      class="select"
                      formControlName="nivel_verificacion"
                    >
                      <option [value]="1">Nivel 1</option>
                      <option [value]="2">Nivel 2</option>
                      <option [value]="3">Nivel 3</option>
                      <option [value]="4">Nivel 4</option>
                    </select>
                    <span class="ayuda">
                      Con nivel 2 o superior y antecedentes
                      vigentes el trabajador queda habilitado para
                      ofertar.
                    </span>
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
                } @else {
                  <div class="campo">
                    <label class="etiqueta" for="motivo"
                      >Motivo</label
                    >
                    <textarea
                      id="motivo"
                      class="textarea"
                      formControlName="motivo_rechazo"
                      maxlength="500"
                      placeholder="Explica qué debe corregir el trabajador."
                    ></textarea>
                    <span class="ayuda">
                      Obligatorio para rechazar o pedir nuevos
                      datos.
                    </span>
                  </div>
                }

                @if (errorRevision()) {
                  <div class="alerta alerta--error">
                    <span>{{ errorRevision() }}</span>
                  </div>
                }

                <button
                  type="submit"
                  class="btn btn--primario btn--bloque"
                  [disabled]="enviando()"
                >
                  {{
                    enviando()
                      ? 'Guardando decisión…'
                      : 'Guardar decisión'
                  }}
                </button>
                <a
                  routerLink="/supervisor/verificaciones"
                  class="btn btn--contorno btn--bloque"
                  >Cancelar</a
                >
              </form>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class RevisionVerificacion implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly verificacionService = inject(
    VerificacionService,
  );
  private readonly toast = inject(ToastService);

  protected readonly expediente =
    signal<ExpedienteVerificacion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly errorRevision = signal('');
  protected readonly etiquetaEstadoTrabajador =
    etiquetaEstadoTrabajador;
  protected readonly etiquetaEstadoRevision =
    etiquetaEstadoRevision;
  protected readonly etiquetaDocumento = etiquetaDocumento;
  protected readonly claseTonoRevision = claseTonoRevision;
  protected readonly claseTonoTrabajador =
    claseTonoTrabajador;
  protected readonly formatearFecha = formatearFecha;

  protected readonly formulario = this.fb.group({
    decision: ['APROBAR' as DecisionRevision, [Validators.required]],
    nivel_verificacion: [2, [Validators.min(1), Validators.max(4)]],
    motivo_rechazo: [''],
    vence_antecedentes: [''],
  });

  ngOnInit(): void {
    void this.cargar();
  }

  protected async revisar(): Promise<void> {
    const datos = this.expediente();
    if (!datos) {
      return;
    }
    this.errorRevision.set('');
    const valores = this.formulario.getRawValue();
    if (
      valores.decision !== 'APROBAR' &&
      !valores.motivo_rechazo.trim()
    ) {
      this.errorRevision.set(
        'Indica el motivo para rechazar o solicitar nuevos datos.',
      );
      return;
    }
    this.enviando.set(true);
    try {
      const resultado = await this.verificacionService.revisar(
        datos.trabajador_id,
        {
          decision: valores.decision,
          motivo_rechazo:
            valores.decision === 'APROBAR'
              ? undefined
              : valores.motivo_rechazo.trim(),
          ...(valores.decision === 'APROBAR'
            ? {
                nivel_verificacion: Number(
                  valores.nivel_verificacion,
                ),
                ...(valores.vence_antecedentes
                  ? {
                      vence_antecedentes:
                        valores.vence_antecedentes,
                    }
                  : {}),
              }
            : {}),
        },
      );
      this.toast.exito(resultado.mensaje);
      await this.router.navigate([
        '/supervisor/verificaciones',
      ]);
    } catch (error) {
      this.errorRevision.set(mensajeDeError(error));
    } finally {
      this.enviando.set(false);
    }
  }

  protected async verDocumento(
    documento: DocumentoRevision,
  ): Promise<void> {
    const datos = this.expediente();
    if (!datos) {
      return;
    }
    try {
      const blob =
        await this.verificacionService.descargarDocumento(
          datos.trabajador_id,
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
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Expediente no encontrado.');
      this.cargando.set(false);
      return;
    }
    try {
      const bandeja = await this.verificacionService.bandeja();
      const expediente = bandeja.find(
        (item) => item.trabajador_id === id,
      );
      if (!expediente) {
        this.error.set(
          'El expediente ya no está en la bandeja de revisión.',
        );
        return;
      }
      this.expediente.set(expediente);
      this.formulario.patchValue({
        nivel_verificacion: Math.max(
          2,
          expediente.nivel_verificacion,
        ),
      });
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
