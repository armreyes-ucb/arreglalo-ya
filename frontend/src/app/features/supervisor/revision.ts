import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
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
  DecisionRevisionDocumento,
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
        <a routerLink="/supervisor/verificaciones" class="migaja">← Volver a la bandeja</a>

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
                {{ datos.telefono }} · Nivel {{ datos.nivel_verificacion }} ·
                {{ datos.horas_en_espera }} h en espera
              </p>
            </div>
            <div class="fila">
              @if (datos.mas_de_48_horas) {
                <span class="insignia insignia--rojo">Más de 48 horas</span>
              }
              <span class="insignia" [class]="'insignia ' + claseTonoTrabajador(datos.estado)">
                {{ etiquetaEstadoTrabajador(datos.estado) }}
              </span>
            </div>
          </div>

          <div class="rejilla rejilla--2">
            <div class="pila">
              <div class="tarjeta">
                <h2>Documentos del expediente</h2>
                <div class="pila mt-1">
                  @for (documento of datos.documentos; track documento.id) {
                    <div class="tarjeta tarjeta--plana">
                      <div class="fila fila--separada">
                        <strong>{{ etiquetaDocumento(documento.tipo) }}</strong>
                        <span
                          class="insignia"
                          [class]="'insignia ' + claseTonoRevision(documento.estado)"
                        >
                          {{ etiquetaEstadoRevision(documento.estado) }}
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
                        <p class="tiny mt-1" style="color: var(--rojo-700)">
                          {{ documento.motivo_rechazo }}
                        </p>
                      }
                      @if (documento.estado === 'PENDIENTE') {
                        <div class="formulario mt-1">
                          <div class="campo">
                            <label class="etiqueta" [for]="'decision-' + documento.id"
                              >Decisión</label
                            >
                            <select #decision class="select" [id]="'decision-' + documento.id">
                              <option value="APROBAR">Aprobar</option>
                              <option value="REQUIERE_DATOS">Solicitar corrección</option>
                            </select>
                          </div>
                          <div class="campo">
                            <label class="etiqueta" [for]="'comentario-' + documento.id"
                              >Comentario obligatorio</label
                            >
                            <textarea
                              #comentario
                              class="textarea"
                              [id]="'comentario-' + documento.id"
                              maxlength="500"
                              placeholder="Indica el resultado de la revisión"
                            ></textarea>
                          </div>
                          <button
                            type="button"
                            class="btn btn--primario"
                            [disabled]="enviando()"
                            (click)="
                              revisarDocumento(
                                documento,
                                decisionDocumento(decision.value),
                                comentario
                              )
                            "
                          >
                            {{ enviando() ? 'Guardando…' : 'Guardar revisión' }}
                          </button>
                        </div>
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
                  <p class="small muted">El trabajador no registró cuenta bancaria.</p>
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
              <h2>Información del expediente</h2>
              <p class="small muted">Revisa y decide cada documento de forma individual.</p>
              @if (errorRevision()) {
                <div class="alerta alerta--error">
                  <span>{{ errorRevision() }}</span>
                </div>
              }
              <a routerLink="/supervisor/verificaciones" class="btn btn--contorno btn--bloque"
                >Volver a la bandeja</a
              >
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class RevisionVerificacion implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly verificacionService = inject(VerificacionService);
  private readonly toast = inject(ToastService);

  protected readonly expediente = signal<ExpedienteVerificacion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly errorRevision = signal('');
  protected readonly etiquetaEstadoTrabajador = etiquetaEstadoTrabajador;
  protected readonly etiquetaEstadoRevision = etiquetaEstadoRevision;
  protected readonly etiquetaDocumento = etiquetaDocumento;
  protected readonly claseTonoRevision = claseTonoRevision;
  protected readonly claseTonoTrabajador = claseTonoTrabajador;
  protected readonly formatearFecha = formatearFecha;
  protected readonly decisionDocumento = (valor: string): DecisionRevisionDocumento =>
    valor === 'REQUIERE_DATOS' ? 'REQUIERE_DATOS' : 'APROBAR';

  ngOnInit(): void {
    void this.cargar();
  }

  protected async revisarDocumento(
    documento: DocumentoRevision,
    decision: DecisionRevisionDocumento,
    comentario: HTMLTextAreaElement,
  ): Promise<void> {
    const datos = this.expediente();
    const motivo = comentario.value.trim();
    if (!datos) return;
    if (decision !== 'APROBAR' && !motivo) {
      this.errorRevision.set('El comentario es obligatorio al solicitar una corrección.');
      comentario.focus();
      return;
    }
    this.errorRevision.set('');
    this.enviando.set(true);
    try {
      const resultado = await this.verificacionService.revisarDocumento(
        datos.trabajador_id,
        documento.id,
        { decision, motivo_rechazo: motivo || undefined },
      );
      this.toast.exito(resultado.mensaje);
      await this.cargar();
    } catch (error) {
      this.errorRevision.set(mensajeDeError(error));
    } finally {
      this.enviando.set(false);
    }
  }

  protected async verDocumento(documento: DocumentoRevision): Promise<void> {
    const datos = this.expediente();
    if (!datos) {
      return;
    }
    try {
      const blob = await this.verificacionService.descargarDocumento(
        datos.trabajador_id,
        documento.id,
      );
      const url = URL.createObjectURL(blob);
      const ventana = window.open(url, '_blank');
      if (!ventana) {
        this.toast.error('Habilita las ventanas emergentes para ver el documento.');
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
      const expediente = bandeja.find((item) => item.trabajador_id === id);
      if (!expediente) {
        this.error.set('El expediente ya no está en la bandeja de revisión.');
        return;
      }
      this.expediente.set(expediente);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
