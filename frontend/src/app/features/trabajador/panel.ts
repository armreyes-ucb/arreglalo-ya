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
  claseTonoTrabajador,
  etiquetaEstadoTrabajador,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import {
  formatearNivel,
} from '../../core/formato';
import type {
  EstadoVerificacion,
  OfertaConSolicitud,
  PerfilTrabajadorPropio,
} from '../../core/models';
import { SolicitudesService } from '../../core/solicitudes.service';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { VerificacionService } from '../../core/verificacion.service';

@Component({
  selector: 'app-panel-trabajador',
  imports: [RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Panel del trabajador</span>
            <h1>
              Hola,
              {{
                auth.usuario()?.nombre_completo?.split(' ')?.[0]
              }}
            </h1>
            <p>
              Revisa tu estado, tus ofertas y los trabajos
              disponibles en tu zona.
            </p>
          </div>
          <a
            routerLink="/trabajador/trabajos"
            class="btn btn--ambar"
          >
            Ver trabajos disponibles
          </a>
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando tu perfil…
          </div>
        } @else if (sinPerfil()) {
          <div class="tarjeta centrado">
            <div class="vacio__icono">!</div>
            <h2>Activa tu perfil de trabajador</h2>
            <p class="muted">
              Elige tus especialidades y zonas para empezar a
              recibir solicitudes.
            </p>
            <a
              routerLink="/activar-trabajador"
              class="btn btn--primario"
            >
              Activar rol de trabajador
            </a>
          </div>
        } @else if (perfil(); as datos) {
          @if (error()) {
            <div class="alerta alerta--error">
              <span>{{ error() }}</span>
            </div>
          }

          @if (!datos.puede_ofertar) {
            <div class="alerta alerta--aviso">
              <span>
                <strong>No puedes ofertar todavía.</strong>
                {{ datos.motivo_bloqueo }}
              </span>
            </div>
          }

          <div class="rejilla rejilla--3 seccion">
            <div class="tarjeta">
              <span class="estadistica__texto">Estado</span>
              <div class="fila mt-1">
                <span
                  class="insignia"
                  [class]="
                    'insignia ' + claseTono(datos.estado)
                  "
                >
                  {{ etiquetaEstado(datos.estado) }}
                </span>
              </div>
              <span class="small muted mt-1">
                Nivel {{ datos.nivel_verificacion }} ·
                {{ formatearNivel(datos.nivel_verificacion) }}
              </span>
            </div>
            <div class="tarjeta">
              <span class="estadistica__texto"
                >Trabajos completados</span
              >
              <span class="estadistica__valor">{{
                datos.trabajos_completados
              }}</span>
              <span class="small muted">
                Calificación promedio:
                {{
                  datos.promedio > 0
                    ? datos.promedio.toFixed(1) + ' / 5'
                    : 'sin calificaciones'
                }}
              </span>
            </div>
            <div class="tarjeta">
              <span class="estadistica__texto"
                >Ofertas enviadas</span
              >
              <span class="estadistica__valor">{{
                ofertas().length
              }}</span>
              <a
                routerLink="/trabajador/mis-ofertas"
                class="small"
                >Ver mis ofertas</a
              >
            </div>
          </div>

          <div class="rejilla rejilla--2">
            <div class="pila">
              <div class="tarjeta">
                <div class="tarjeta__cabecera">
                  <h2>Verificación</h2>
                  <a
                    routerLink="/trabajador/verificacion"
                    class="small"
                    >Gestionar</a
                  >
                </div>
                @if (estadoVerificacion(); as verificacion) {
                  <div class="fila">
                    <span
                      class="insignia"
                      [class]="
                        'insignia ' +
                        claseTono(verificacion.estado)
                      "
                    >
                      {{
                        etiquetaEstado(verificacion.estado)
                      }}
                    </span>
                    <span class="etiqueta-suave">
                      Nivel
                      {{ verificacion.nivel_verificacion }}
                    </span>
                  </div>
                  @if (
                    verificacion.antecedentes_por_vencer ||
                    verificacion.antecedentes_vencidos
                  ) {
                    <p class="small mt-2" style="color: var(--rojo-700)">
                      Tus antecedentes
                      {{
                        verificacion.antecedentes_vencidos
                          ? 'están vencidos'
                          : 'están por vencer'
                      }}. Actualiza tu REJAP para seguir
                      ofertando.
                    </p>
                  } @else {
                    <p class="small muted mt-2">
                      Tus documentos están al día. Mantén tu REJAP
                      vigente para conservar la habilitación.
                    </p>
                  }
                } @else {
                  <p class="small muted">
                    Completa la carga de documentos para que un
                    supervisor valide tu cuenta.
                  </p>
                }
                <a
                  routerLink="/trabajador/verificacion"
                  class="btn btn--contorno btn--sm mt-1"
                >
                  Cargar o revisar documentos
                </a>
              </div>

              <div class="tarjeta">
                <h2>Mi perfil</h2>
                <p class="small muted">
                  Especialidades, horarios, precios referenciales,
                  zonas y fotos de trabajos.
                </p>
                <a
                  routerLink="/trabajador/perfil"
                  class="btn btn--contorno btn--sm"
                >
                  Editar perfil
                </a>
              </div>
            </div>

            <div class="tarjeta">
              <div class="tarjeta__cabecera">
                <h2>Ofertas recientes</h2>
                <a
                  routerLink="/trabajador/mis-ofertas"
                  class="small"
                  >Ver todas</a
                >
              </div>
              @if (ofertas().length === 0) {
                <div class="vacio">
                  <div class="vacio__icono">+</div>
                  <p>
                    Aún no enviaste ofertas. Revisa los trabajos
                    disponibles en tus zonas.
                  </p>
                  <a
                    routerLink="/trabajador/trabajos"
                    class="btn btn--primario btn--sm"
                  >
                    Buscar trabajos
                  </a>
                </div>
              } @else {
                <div class="pila">
                  @for (
                    oferta of ofertas().slice(0, 3);
                    track oferta.id
                  ) {
                    <div class="tarjeta tarjeta--plana">
                      <strong>{{
                        oferta.solicitud.tipo_problema
                      }}</strong>
                      <div class="small muted">
                        {{ oferta.solicitud.zona?.nombre }} ·
                        Bs
                        {{
                          (
                            oferta.precio_estimado +
                            oferta.costo_transporte
                          ).toFixed(2)
                        }}
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class PanelTrabajador implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly trabajadoresService = inject(
    TrabajadoresService,
  );
  private readonly verificacionService = inject(
    VerificacionService,
  );
  private readonly solicitudesService = inject(
    SolicitudesService,
  );

  protected readonly perfil =
    signal<PerfilTrabajadorPropio | null>(null);
  protected readonly estadoVerificacion =
    signal<EstadoVerificacion | null>(null);
  protected readonly ofertas = signal<OfertaConSolicitud[]>([]);
  protected readonly cargando = signal(true);
  protected readonly sinPerfil = signal(false);
  protected readonly error = signal('');
  protected readonly etiquetaEstado = etiquetaEstadoTrabajador;
  protected readonly claseTono = claseTonoTrabajador;
  protected readonly formatearNivel = formatearNivel;

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const perfil = await this.trabajadoresService.perfilPropio();
      this.perfil.set(perfil);
      const [verificacion, ofertas] = await Promise.all([
        this.verificacionService
          .estado()
          .catch(() => null),
        this.solicitudesService.misOfertas().catch(() => []),
      ]);
      this.estadoVerificacion.set(verificacion);
      this.ofertas.set(ofertas);
    } catch (error) {
      const mensaje = mensajeDeError(error);
      if (mensaje.includes('No existe un perfil')) {
        this.sinPerfil.set(true);
      } else {
        this.error.set(mensaje);
      }
    } finally {
      this.cargando.set(false);
    }
  }
}
