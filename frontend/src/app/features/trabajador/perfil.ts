import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ESPECIALIDADES,
  claseTonoTrabajador,
  etiquetaEstadoTrabajador,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import { formatearNivel } from '../../core/formato';
import type {
  Especialidad,
  PerfilTrabajadorPropio,
  Zona,
} from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { UploadsService } from '../../core/uploads.service';
import { ZonasService } from '../../core/zonas.service';
import { ImagenUrlPipe } from '../../shared/pipes';

@Component({
  selector: 'app-perfil-trabajador',
  imports: [ReactiveFormsModule, RouterLink, ImagenUrlPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Trabajador</span>
            <h1>Mi perfil profesional</h1>
            <p>
              Muestra tus especialidades, precios referenciales y
              fotos de trabajos a los clientes.
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
            Cargando tu perfil…
          </div>
        } @else if (sinPerfil()) {
          <div class="tarjeta centrado">
            <div class="vacio__icono">!</div>
            <h2>Tu perfil todavía no existe</h2>
            <p class="muted">
              Activa el rol de trabajador para crear tu perfil
              profesional.
            </p>
            <a
              routerLink="/activar-trabajador"
              class="btn btn--primario"
              >Activar rol de trabajador</a
            >
          </div>
        } @else if (perfil(); as datos) {
          @if (error()) {
            <div class="alerta alerta--error">
              <span>{{ error() }}</span>
            </div>
          }

          <div class="tarjeta mb-2">
            <div class="fila fila--separada">
              <div>
                <h2 style="margin:0">
                  {{ datos.nombre_completo }}
                </h2>
                <div class="fila mt-1">
                  <span
                    class="insignia"
                    [class]="
                      'insignia ' + claseTono(datos.estado)
                    "
                  >
                    {{
                      etiquetaEstadoTrabajador(datos.estado)
                    }}
                  </span>
                  <span class="etiqueta-suave">
                    {{ formatearNivel(datos.nivel_verificacion) }}
                  </span>
                  <span class="etiqueta-suave">
                    {{ datos.trabajos_completados }} trabajo(s)
                  </span>
                  @if (datos.promedio > 0) {
                    <span class="etiqueta-suave">
                      ★ {{ datos.promedio.toFixed(1) }}
                    </span>
                  }
                </div>
              </div>
              @if (!datos.puede_ofertar) {
                <div class="alerta alerta--aviso" style="margin:0">
                  <span>{{ datos.motivo_bloqueo }}</span>
                </div>
              }
            </div>
          </div>

          <form
            class="pila"
            [formGroup]="formulario"
            (ngSubmit)="guardar()"
          >
            <div class="tarjeta">
              <h2>Especialidades</h2>
              <div class="rejilla rejilla--2 mt-1">
                @for (
                  especialidad of especialidades;
                  track especialidad.valor
                ) {
                  <label
                    class="opcion"
                    [class.opcion--activa]="
                      seleccionadas().includes(
                        especialidad.valor
                      )
                    "
                  >
                    <input
                      type="checkbox"
                      [checked]="
                        seleccionadas().includes(
                          especialidad.valor
                        )
                      "
                      (change)="
                        alternarEspecialidad(
                          especialidad.valor
                        )
                      "
                    />
                    <span>
                      <strong>{{
                        especialidad.etiqueta
                      }}</strong>
                      <span
                        class="small muted"
                        style="display:block"
                        >{{ especialidad.descripcion }}</span
                      >
                    </span>
                  </label>
                }
              </div>
            </div>

            <div class="tarjeta">
              <h2>Precios referenciales (Bs)</h2>
              <p class="small muted">
                Son montos de referencia; el precio final se acuerda
                en cada oferta.
              </p>
              <div class="formulario--rejilla mt-1">
                @for (
                  especialidad of especialidades;
                  track especialidad.valor
                ) {
                  <div class="campo">
                    <label
                      class="etiqueta"
                      [for]="'precio-' + especialidad.valor"
                      >{{ especialidad.etiqueta }}</label
                    >
                    <input
                      [id]="'precio-' + especialidad.valor"
                      type="number"
                      class="input"
                      min="0"
                      step="0.5"
                      [formControlName]="
                        'precio_' + especialidad.valor
                      "
                      placeholder="0.00"
                    />
                  </div>
                }
              </div>
            </div>

            <div class="tarjeta">
              <h2>Zonas de trabajo</h2>
              <div class="rejilla rejilla--2 mt-1">
                @for (zona of zonas(); track zona.id) {
                  <label
                    class="opcion"
                    [class.opcion--activa]="
                      zonasSeleccionadas().includes(zona.id)
                    "
                  >
                    <input
                      type="checkbox"
                      [checked]="
                        zonasSeleccionadas().includes(zona.id)
                      "
                      (change)="alternarZona(zona.id)"
                    />
                    <span>
                      <strong>{{ zona.nombre }}</strong>
                      <span
                        class="small muted"
                        style="display:block"
                        >{{ zona.otb }} · {{ zona.municipio }}</span
                      >
                    </span>
                  </label>
                }
              </div>
            </div>

            <div class="tarjeta">
              <h2>Horarios de atención</h2>
              <div class="campo mt-1">
                <label class="etiqueta" for="horarios"
                  >Describe tu disponibilidad</label
                >
                <input
                  id="horarios"
                  type="text"
                  class="input"
                  formControlName="horarios"
                  placeholder="Ej. Lunes a sábado de 08:00 a 18:00"
                />
              </div>
            </div>

            <div class="tarjeta">
              <h2>Fotos de trabajos</h2>
              <p class="small muted">
                Muestra trabajos anteriores. Máximo 6 fotos.
              </p>
              <input
                type="file"
                class="input"
                accept="image/jpeg,image/png,image/webp"
                [disabled]="subiendoFoto() || fotos().length >= 6"
                (change)="subirFoto($event)"
              />
              @if (subiendoFoto()) {
                <span class="ayuda">Subiendo foto…</span>
              }
              @if (fotos().length > 0) {
                <div class="galeria mt-2">
                  @for (foto of fotos(); track foto) {
                    <div>
                      <img [src]="foto | imagenUrl" alt="Trabajo" />
                      <button
                        type="button"
                        class="enlace-boton small"
                        (click)="quitarFoto(foto)"
                      >
                        Quitar
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <button
              type="submit"
              class="btn btn--primario"
              [disabled]="guardando()"
            >
              {{
                guardando() ? 'Guardando…' : 'Guardar cambios'
              }}
            </button>
          </form>
        }
      </div>
    </section>
  `,
})
export class PerfilTrabajador implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly trabajadoresService = inject(
    TrabajadoresService,
  );
  private readonly zonasService = inject(ZonasService);
  private readonly uploads = inject(UploadsService);
  private readonly toast = inject(ToastService);

  protected readonly especialidades = ESPECIALIDADES;
  protected readonly etiquetaEstadoTrabajador =
    etiquetaEstadoTrabajador;
  protected readonly claseTono = claseTonoTrabajador;
  protected readonly formatearNivel = formatearNivel;

  protected readonly perfil =
    signal<PerfilTrabajadorPropio | null>(null);
  protected readonly zonas = signal<Zona[]>([]);
  protected readonly seleccionadas = signal<Especialidad[]>([]);
  protected readonly zonasSeleccionadas = signal<number[]>([]);
  protected readonly fotos = signal<string[]>([]);
  protected readonly cargando = signal(true);
  protected readonly sinPerfil = signal(false);
  protected readonly guardando = signal(false);
  protected readonly subiendoFoto = signal(false);
  protected readonly error = signal('');

  protected readonly formulario = this.fb.group({
    horarios: [''],
    precio_PLOMERIA: [''],
    precio_ALBANILERIA: [''],
    precio_ELECTRICIDAD: [''],
    precio_ELECTRODOMESTICOS: [''],
  });

  ngOnInit(): void {
    void this.cargar();
  }

  protected alternarEspecialidad(
    especialidad: Especialidad,
  ): void {
    this.seleccionadas.update((actuales) =>
      actuales.includes(especialidad)
        ? actuales.filter((item) => item !== especialidad)
        : [...actuales, especialidad],
    );
  }

  protected alternarZona(zonaId: number): void {
    this.zonasSeleccionadas.update((actuales) =>
      actuales.includes(zonaId)
        ? actuales.filter((item) => item !== zonaId)
        : [...actuales, zonaId],
    );
  }

  protected async subirFoto(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo) {
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      this.toast.error(
        `${archivo.name} supera el límite de 5 MB.`,
      );
      return;
    }
    this.subiendoFoto.set(true);
    try {
      const url = await this.uploads.subirImagen(archivo);
      this.fotos.update((fotos) => [...fotos, url]);
    } catch (error) {
      this.toast.error(mensajeDeError(error));
    } finally {
      this.subiendoFoto.set(false);
    }
  }

  protected quitarFoto(url: string): void {
    this.fotos.update((fotos) =>
      fotos.filter((foto) => foto !== url),
    );
  }

  protected async guardar(): Promise<void> {
    this.error.set('');
    if (this.seleccionadas().length === 0) {
      this.error.set('Selecciona al menos una especialidad.');
      return;
    }
    if (this.zonasSeleccionadas().length === 0) {
      this.error.set('Selecciona al menos una zona.');
      return;
    }
    const valores = this.formulario.getRawValue();
    const precios: Record<string, number> = {};
    for (const especialidad of ESPECIALIDADES) {
      const clave = `precio_${especialidad.valor}`;
      const valor = Number(
        valores[clave as keyof typeof valores],
      );
      if (Number.isFinite(valor) && valor > 0) {
        precios[especialidad.valor] = valor;
      }
    }
    this.guardando.set(true);
    try {
      const actualizado =
        await this.trabajadoresService.actualizarPerfil({
          especialidades: this.seleccionadas(),
          zonas_ids: this.zonasSeleccionadas(),
          horarios: valores.horarios.trim(),
          precios_estimados: precios,
          fotos_urls: this.fotos(),
        });
      this.perfil.set(actualizado);
      this.aplicarPerfil(actualizado);
      this.toast.exito('Perfil actualizado correctamente.');
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const [perfil, zonas] = await Promise.all([
        this.trabajadoresService.perfilPropio(),
        this.zonasService.listar(),
      ]);
      this.perfil.set(perfil);
      this.zonas.set(zonas);
      this.aplicarPerfil(perfil);
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

  private aplicarPerfil(
    perfil: PerfilTrabajadorPropio,
  ): void {
    this.seleccionadas.set([...perfil.especialidades]);
    this.zonasSeleccionadas.set(
      perfil.zonas.map((zona) => zona.id),
    );
    this.fotos.set([...perfil.fotos_trabajos]);
    const precios: Record<string, string> = {
      horarios: perfil.horarios ?? '',
    };
    for (const especialidad of ESPECIALIDADES) {
      const valor =
        perfil.precios_estimados[especialidad.valor];
      precios[`precio_${especialidad.valor}`] =
        valor !== undefined ? String(valor) : '';
    }
    this.formulario.patchValue(precios);
  }
}
