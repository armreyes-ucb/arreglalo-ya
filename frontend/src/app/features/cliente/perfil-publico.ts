import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { etiquetaEspecialidad } from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import { formatearNivel } from '../../core/formato';
import type { TrabajadorPublico } from '../../core/models';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { ImagenUrlPipe, MonedaPipe } from '../../shared/pipes';

@Component({
  selector: 'app-perfil-publico',
  imports: [RouterLink, ImagenUrlPipe, MonedaPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <a routerLink="/cliente/buscar" class="migaja"
          >← Volver a la búsqueda</a
        >

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando perfil…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else if (trabajador(); as perfil) {
          <div class="rejilla rejilla--2">
            <div class="pila">
              <div class="tarjeta">
                <div class="fila fila--arriba">
                  @if (perfil.fotos_trabajos.length) {
                    <img
                      [src]="perfil.fotos_trabajos[0] | imagenUrl"
                      alt=""
                      style="width:72px;height:72px;object-fit:cover;border-radius:16px"
                    />
                  } @else {
                    <span
                      class="avatar"
                      style="width:64px;height:64px;font-size:1.3rem"
                      >{{ inicial(perfil.nombre_completo) }}</span
                    >
                  }
                  <div>
                    <h1>{{ perfil.nombre_completo }}</h1>
                    <div class="fila">
                      <span class="insignia insignia--verde">
                        {{
                          formatearNivel(
                            perfil.nivel_verificacion
                          )
                        }}
                      </span>
                      @if (perfil.promedio > 0) {
                        <span class="etiqueta-suave">
                          ★ {{ perfil.promedio.toFixed(1) }}
                        </span>
                      }
                      <span class="etiqueta-suave">
                        {{ perfil.trabajos_completados }}
                        trabajo(s) completados
                      </span>
                    </div>
                  </div>
                </div>

                <p class="small muted mt-2">
                  Perfil público. El contacto directo y la
                  dirección se comparten solo cuando una solicitud
                  está confirmada.
                </p>
              </div>

              <div class="tarjeta">
                <h2>Trabajos realizados</h2>
                <p class="small muted mt-1">
                  {{ perfil.trabajos_completados }} trabajo(s)
                  completados.
                </p>
                @if (perfil.fotos_trabajos.length) {
                  <div class="galeria galeria--amplia mt-1">
                    @for (
                      foto of perfil.fotos_trabajos;
                      track foto
                    ) {
                      <img
                        [src]="foto | imagenUrl"
                        alt="Trabajo del técnico"
                      />
                    }
                  </div>
                } @else {
                  <p class="small muted">
                    Aún no hay fotos de trabajos publicadas.
                  </p>
                }
              </div>
            </div>

            <div class="pila">
              <div class="tarjeta">
                <h2>Especialidades</h2>
                <div class="fila mt-1">
                  @for (
                    especialidad of perfil.especialidades;
                    track especialidad
                  ) {
                    <span class="insignia insignia--azul">{{
                      etiquetaEspecialidad(especialidad)
                    }}</span>
                  }
                </div>
              </div>

              <div class="tarjeta">
                <h2>Zonas de atención</h2>
                <div class="fila mt-1">
                  @for (zona of perfil.zonas; track zona.id) {
                    <span class="etiqueta-suave"
                      >{{ zona.nombre }} ·
                      {{ zona.municipio }}</span
                    >
                  }
                </div>
              </div>

              <div class="tarjeta">
                <h2>Precios referenciales</h2>
                @if (precios().length === 0) {
                  <p class="small muted">
                    El técnico aún no registró precios
                    referenciales. Puedes solicitar una oferta.
                  </p>
                } @else {
                  <table class="tabla mt-1">
                    <thead>
                      <tr>
                        <th>Especialidad</th>
                        <th>Desde</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (precio of precios(); track precio.nombre) {
                        <tr>
                          <td>{{ precio.nombre }}</td>
                          <td>{{ precio.valor | moneda }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              </div>

              @if (perfil.horarios) {
                <div class="tarjeta">
                  <h2>Horarios</h2>
                  <p class="small mt-1">{{ perfil.horarios }}</p>
                </div>
              }

              <div class="tarjeta">
                <h2>Opiniones</h2>
                <p class="small muted mt-1">
                  Aún no hay opiniones. Aparecerán cuando el
                  trabajador finalice sus primeros trabajos.
                </p>
              </div>

              <a
                routerLink="/cliente/publicar"
                class="btn btn--ambar btn--bloque"
              >
                Publicar una solicitud
              </a>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class PerfilPublico implements OnInit {
  private readonly ruta = inject(ActivatedRoute);
  private readonly trabajadoresService = inject(
    TrabajadoresService,
  );

  protected readonly trabajador =
    signal<TrabajadorPublico | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly etiquetaEspecialidad =
    etiquetaEspecialidad;
  protected readonly formatearNivel = formatearNivel;

  protected inicial(nombre: string): string {
    return nombre.charAt(0).toUpperCase();
  }

  protected precios(): Array<{
    nombre: string;
    valor: number;
  }> {
    const perfil = this.trabajador();
    if (!perfil) {
      return [];
    }
    return Object.entries(perfil.precios_estimados).map(
      ([clave, valor]) => ({
        nombre: etiquetaEspecialidad(clave),
        valor,
      }),
    );
  }

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Trabajador no encontrado.');
      this.cargando.set(false);
      return;
    }
    try {
      this.trabajador.set(
        await this.trabajadoresService.perfilPublico(id),
      );
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
