import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ESPECIALIDADES,
  etiquetaEspecialidad,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import {
  formatearBs,
  formatearDistancia,
  formatearNivel,
} from '../../core/formato';
import type { TrabajadorMatch, Zona } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { ZonasService } from '../../core/zonas.service';
import { ImagenUrlPipe } from '../../shared/pipes';

@Component({
  selector: 'app-buscar-trabajadores',
  imports: [ReactiveFormsModule, RouterLink, ImagenUrlPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Cliente</span>
            <h1>Buscar técnicos</h1>
            <p>
              Filtra por zona y especialidad para ver trabajadores
              verificados y disponibles.
            </p>
          </div>
        </div>

        <form
          class="tarjeta mb-2"
          [formGroup]="filtros"
          (ngSubmit)="buscar()"
        >
          <div class="formulario--rejilla">
            <div class="campo">
              <label class="etiqueta" for="zona"
                >Zona</label
              >
              <select
                id="zona"
                class="select"
                formControlName="zona_id"
              >
                <option [value]="0">Todas las zonas</option>
                @for (zona of zonas(); track zona.id) {
                  <option [value]="zona.id">
                    {{ zona.nombre }} · {{ zona.municipio }}
                  </option>
                }
              </select>
            </div>
            <div class="campo">
              <label class="etiqueta" for="especialidad"
                >Especialidad</label
              >
              <select
                id="especialidad"
                class="select"
                formControlName="especialidad"
              >
                <option value="">Todas</option>
                @for (
                  especialidad of especialidades;
                  track especialidad.valor
                ) {
                  <option [value]="especialidad.valor">
                    {{ especialidad.etiqueta }}
                  </option>
                }
              </select>
            </div>
          </div>
          <div class="fila mt-2">
            <button
              type="submit"
              class="btn btn--primario"
              [disabled]="buscando()"
            >
              {{ buscando() ? 'Buscando…' : 'Buscar técnicos' }}
            </button>
            @if (sinZona()) {
              <span class="small muted">
                Elige una zona específica para buscar.
              </span>
            }
          </div>
        </form>

        @if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        }

        @if (buscando()) {
          <div class="cargando">
            <span class="girador"></span>
            Buscando trabajadores…
          </div>
        } @else if (resultados().length > 0) {
          <p class="small muted">
            {{ resultados().length }} técnico(s) encontrados,
            ordenados por cercanía y calificación.
          </p>
          <div class="rejilla rejilla--3">
            @for (trabajador of resultados(); track trabajador.id) {
              <div class="tarjeta">
                <div class="fila fila--arriba">
                  @if (trabajador.fotos_trabajos.length) {
                    <img
                      [src]="
                        trabajador.fotos_trabajos[0] | imagenUrl
                      "
                      alt=""
                      style="width:56px;height:56px;object-fit:cover;border-radius:12px"
                    />
                  } @else {
                    <span class="avatar avatar--ambar">{{
                      trabajador.nombre_completo.charAt(0)
                    }}</span>
                  }
                  <div>
                    <strong>{{
                      trabajador.nombre_completo
                    }}</strong>
                    <div class="small muted">
                      {{
                        formatearNivel(
                          trabajador.nivel_verificacion
                        )
                      }}
                    </div>
                  </div>
                </div>

                <div class="fila mt-1">
                  <span class="etiqueta-suave">{{
                    formatearDistancia(trabajador.distancia)
                  }}</span>
                  @if (trabajador.promedio > 0) {
                    <span class="etiqueta-suave">
                      ★ {{ trabajador.promedio.toFixed(1) }}
                    </span>
                  }
                  <span class="etiqueta-suave">
                    {{ trabajador.trabajos_completados }}
                    trabajo(s)
                  </span>
                  @if (precioDesde(trabajador); as desde) {
                    <span class="etiqueta-suave">
                      Desde {{ desde }}
                    </span>
                  }
                </div>

                <p class="small muted mt-1">
                  @for (
                    especialidad of trabajador.especialidades;
                    track especialidad
                  ) {
                    <span
                      >{{
                        etiquetaEspecialidad(especialidad)
                      }}<span
                        >&nbsp;·&nbsp;</span
                      ></span
                    >
                  }
                </p>

                <a
                  [routerLink]="[
                    '/cliente/trabajadores',
                    trabajador.id,
                  ]"
                  class="btn btn--contorno btn--sm btn--bloque"
                >
                  Ver perfil
                </a>
              </div>
            }
          </div>
        } @else if (buscado()) {
          <div class="tarjeta">
            <div class="vacio">
              <div class="vacio__icono">?</div>
              <h3>No encontramos técnicos con esos filtros</h3>
              <p>
                Prueba con otra zona o especialidad. También puedes
                publicar una solicitud y recibir ofertas.
              </p>
              <a
                routerLink="/cliente/publicar"
                class="btn btn--primario"
              >
                Publicar solicitud
              </a>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class BuscarTrabajadores implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly zonasService = inject(ZonasService);
  private readonly trabajadoresService = inject(
    TrabajadoresService,
  );
  private readonly toast = inject(ToastService);

  protected readonly especialidades = ESPECIALIDADES;
  protected readonly etiquetaEspecialidad =
    etiquetaEspecialidad;
  protected readonly formatearDistancia = formatearDistancia;
  protected readonly formatearNivel = formatearNivel;
  protected readonly zonas = signal<Zona[]>([]);
  protected readonly resultados = signal<TrabajadorMatch[]>([]);
  protected readonly buscando = signal(false);
  protected readonly buscado = signal(false);
  protected readonly error = signal('');

  protected readonly filtros = this.fb.group({
    zona_id: [0],
    especialidad: [''],
  });

  protected readonly sinZona = signal(false);

  protected precioDesde(trabajador: TrabajadorMatch): string | null {
    const valores = Object.values(
      trabajador.precios_estimados ?? {},
    ).filter((valor) => Number.isFinite(valor) && valor > 0);
    if (valores.length === 0) {
      return null;
    }
    return formatearBs(Math.min(...valores));
  }

  ngOnInit(): void {
    void this.cargarZonas();
  }

  protected async buscar(): Promise<void> {
    this.error.set('');
    const { zona_id, especialidad } =
      this.filtros.getRawValue();
    if (!zona_id) {
      this.sinZona.set(true);
      this.toast.info(
        'Elige una zona específica para buscar técnicos.',
      );
      return;
    }
    this.sinZona.set(false);
    this.buscando.set(true);
    this.buscado.set(true);
    try {
      this.resultados.set(
        await this.trabajadoresService.buscar(
          Number(zona_id),
          especialidad || null,
        ),
      );
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.buscando.set(false);
    }
  }

  private async cargarZonas(): Promise<void> {
    try {
      this.zonas.set(await this.zonasService.listar());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    }
  }
}
