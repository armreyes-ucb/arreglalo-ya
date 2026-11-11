import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  claseTonoTrabajador,
  etiquetaEstadoTrabajador,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type { ExpedienteVerificacion } from '../../core/models';
import { VerificacionService } from '../../core/verificacion.service';

@Component({
  selector: 'app-bandeja-verificaciones',
  imports: [RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Supervisor</span>
            <h1>Bandeja de verificaciones</h1>
            <p>
              Expedientes ordenados por antigüedad. Los casos con
              más de 48 horas se marcan como prioritarios.
            </p>
          </div>
          <button
            type="button"
            class="btn btn--contorno"
            [disabled]="cargando()"
            (click)="cargar()"
          >
            Actualizar
          </button>
        </div>

        @if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        }

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando expedientes…
          </div>
        } @else if (expedientes().length === 0) {
          <div class="tarjeta">
            <div class="vacio">
              <div class="vacio__icono">✓</div>
              <h3>Bandeja vacía</h3>
              <p>No hay expedientes pendientes de revisión.</p>
            </div>
          </div>
        } @else {
          <div class="pila">
            @for (
              expediente of expedientes();
              track expediente.trabajador_id
            ) {
              <div class="tarjeta">
                <div class="fila fila--arriba fila--separada">
                  <div>
                    <div class="fila">
                      <strong>{{
                        expediente.nombre_completo
                      }}</strong>
                      @if (expediente.mas_de_48_horas) {
                        <span class="insignia insignia--rojo"
                          >+48 h</span
                        >
                      }
                      <span
                        class="insignia"
                        [class]="
                          'insignia ' +
                          claseTono(expediente.estado)
                        "
                      >
                        {{
                          etiquetaEstado(expediente.estado)
                        }}
                      </span>
                    </div>
                    <div class="small muted mt-1">
                      {{ expediente.telefono }} · Nivel
                      {{ expediente.nivel_verificacion }} ·
                      {{ expediente.horas_en_espera }} h en espera
                    </div>
                  </div>
                  <a
                    [routerLink]="[
                      '/supervisor/verificaciones',
                      expediente.trabajador_id,
                    ]"
                    class="btn btn--primario btn--sm"
                  >
                    Revisar
                  </a>
                </div>

                <div class="fila mt-2">
                  <span class="etiqueta-suave">
                    {{ expediente.documentos.length }}
                    documento(s)
                  </span>
                  @if (expediente.cuenta_bancaria) {
                    <span class="etiqueta-suave">
                      {{ expediente.cuenta_bancaria.banco }} ·
                      {{ expediente.cuenta_bancaria.titular }}
                    </span>
                  } @else {
                    <span class="insignia insignia--ambar"
                      >Sin cuenta bancaria</span
                    >
                  }
                  @if (expediente.vence_antecedentes) {
                    <span class="etiqueta-suave">
                      REJAP vence:
                      {{ expediente.vence_antecedentes }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class BandejaVerificaciones implements OnInit {
  private readonly verificacionService = inject(
    VerificacionService,
  );

  protected readonly expedientes =
    signal<ExpedienteVerificacion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly etiquetaEstado = etiquetaEstadoTrabajador;
  protected readonly claseTono = claseTonoTrabajador;

  ngOnInit(): void {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.expedientes.set(
        await this.verificacionService.bandeja(),
      );
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
