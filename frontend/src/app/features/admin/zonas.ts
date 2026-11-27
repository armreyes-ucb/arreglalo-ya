import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mensajeDeError } from '../../core/errores';
import type { CoberturaZona, ZonaAdmin } from '../../core/models';
import { AdminService } from '../../core/admin.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-zonas-admin',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Administración</span>
            <h1>Zonas y especialidades</h1>
            <p>Administra el catálogo geográfico y de oficios. Solo SUPERADMIN.</p>
          </div>
          <a routerLink="/admin" class="btn btn--contorno">Volver al panel</a>
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando zonas…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else {
          <div class="tarjeta mb-2">
            <h2>Crear zona</h2>
            <p class="small muted mt-1">Define el nombre, OTB, municipio y zonas vecinas.</p>
            <div class="formulario--rejilla mt-2">
              <div class="campo">
                <label class="etiqueta" for="nombre">Nombre *</label>
                <input
                  id="nombre"
                  type="text"
                  class="input"
                  [(ngModel)]="nuevaZona.nombre"
                  placeholder="Ej. Norte, Centro, Sur"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="otb">OTB *</label>
                <input
                  id="otb"
                  type="text"
                  class="input"
                  [(ngModel)]="nuevaZona.otb"
                  placeholder="Organización Territorial de Base"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="municipio">Municipio *</label>
                <input
                  id="municipio"
                  type="text"
                  class="input"
                  [(ngModel)]="nuevaZona.municipio"
                  placeholder="Ej. Cercado"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="zonas_vecinas"
                  >Zonas vecinas (separadas por coma)</label
                >
                <input
                  id="zonas_vecinas"
                  type="text"
                  class="input"
                  [(ngModel)]="zonasVecinasTexto"
                  placeholder="Norte, Centro"
                />
              </div>
            </div>
            <button
              type="button"
              class="btn btn--primario mt-2"
              [disabled]="creando() || !nuevaZona.nombre.trim()"
              (click)="crear()"
            >
              {{ creando() ? 'Creando…' : 'Crear zona' }}
            </button>
          </div>

          @if (zonas().length === 0) {
            <div class="tarjeta centrado">
              <div class="vacio__icono">🗺️</div>
              <h2>No hay zonas registradas</h2>
              <p class="muted">Crea la primera usando el formulario de arriba.</p>
            </div>
          } @else {
            <div class="tarjeta">
              <h2>Zonas existentes</h2>
              <div class="tabla-responsive mt-2">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>OTB</th>
                      <th>Municipio</th>
                      <th>Estado</th>
                      <th>Trabajadores</th>
                      <th>Solicitudes abiertas</th>
                      <th>Zonas vecinas</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (z of zonas(); track z.id) {
                      <tr>
                        <td>{{ z.id }}</td>
                        <td>{{ z.nombre }}</td>
                        <td>{{ z.otb }}</td>
                        <td>{{ z.municipio }}</td>
                        <td>
                          <span
                            class="insignia"
                            [class.insignia--verde]="z.activa"
                            [class.insignia--neutro]="!z.activa"
                          >
                            {{ z.activa ? 'Activa' : 'Desactivada' }}
                          </span>
                        </td>
                        <td>{{ z.trabajadores_asignados }}</td>
                        <td>{{ z.solicitudes_abiertas }}</td>
                        <td class="small">
                          {{ z.zonas_vecinas.length ? z.zonas_vecinas.join(', ') : '—' }}
                        </td>
                        <td>
                          <div class="fila" style="gap: 0.5rem">
                            <button
                              type="button"
                              class="btn btn--contorno btn--sm"
                              [disabled]="accionEnCurso() === z.id"
                              (click)="editar(z)"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              class="btn btn--contorno btn--sm"
                              [disabled]="accionEnCurso() === z.id"
                              (click)="verCobertura(z)"
                            >
                              Ver cobertura
                            </button>
                            <button
                              type="button"
                              class="btn btn--contorno btn--sm"
                              [disabled]="accionEnCurso() === z.id"
                              (click)="cambiarEstado(z)"
                            >
                              {{ z.activa ? 'Desactivar' : 'Activar' }}
                            </button>
                            <button
                              type="button"
                              class="btn btn--peligro btn--sm"
                              [disabled]="accionEnCurso() === z.id || z.trabajadores_asignados > 0"
                              [title]="
                                z.trabajadores_asignados > 0
                                  ? 'Desactiva la zona para conservar el historial de los trabajadores asignados'
                                  : ''
                              "
                              (click)="eliminar(z)"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        }

        @if (mostrarEditar(); as z) {
          <div class="modal-fondo" (click)="cerrarEditar()">
            <div class="modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
              <div class="fila fila--separada">
                <h2 style="margin:0">Editar zona</h2>
                <button type="button" class="enlace-boton" (click)="cerrarEditar()">Cerrar</button>
              </div>
              <div class="formulario--rejilla mt-2">
                <div class="campo">
                  <label class="etiqueta" for="edit-nombre">Nombre</label>
                  <input id="edit-nombre" type="text" class="input" [(ngModel)]="editNombre" />
                </div>
                <div class="campo">
                  <label class="etiqueta" for="edit-otb">OTB</label>
                  <input id="edit-otb" type="text" class="input" [(ngModel)]="editOtb" />
                </div>
                <div class="campo">
                  <label class="etiqueta" for="edit-municipio">Municipio</label>
                  <input
                    id="edit-municipio"
                    type="text"
                    class="input"
                    [(ngModel)]="editMunicipio"
                  />
                </div>
                <div class="campo">
                  <label class="etiqueta" for="edit-vecinas">Zonas vecinas (coma)</label>
                  <input id="edit-vecinas" type="text" class="input" [(ngModel)]="editVecinas" />
                </div>
              </div>
              <div class="fila mt-2" style="justify-content: flex-end">
                <button type="button" class="btn btn--contorno" (click)="cerrarEditar()">
                  Cancelar
                </button>
                <button
                  type="button"
                  class="btn btn--primario"
                  [disabled]="guardandoEdicion()"
                  (click)="guardarEdicion()"
                >
                  {{ guardandoEdicion() ? 'Guardando…' : 'Guardar' }}
                </button>
              </div>
              @if (errorEdicion()) {
                <div class="alerta alerta--error mt-2">
                  <span>{{ errorEdicion() }}</span>
                </div>
              }
            </div>
          </div>
        }

        @if (cobertura(); as cobertura) {
          <div class="modal-fondo" (click)="cerrarCobertura()">
            <div class="modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
              <div class="fila fila--separada">
                <h2 style="margin:0">Cobertura de {{ cobertura.zona.nombre }}</h2>
                <button type="button" class="enlace-boton" (click)="cerrarCobertura()">
                  Cerrar
                </button>
              </div>
              <p class="small muted mt-1">
                OTB {{ cobertura.zona.otb }} · {{ cobertura.zona.municipio }}
              </p>

              @if (cargandoCobertura()) {
                <div class="cargando"><span class="girador"></span> Consultando cobertura…</div>
              } @else if (errorCobertura()) {
                <div class="alerta alerta--error">
                  <span>{{ errorCobertura() }}</span>
                </div>
              } @else {
                <div class="formulario--rejilla mt-2">
                  <div class="tarjeta">
                    <span class="small muted">Asignados directamente</span>
                    <h2 style="margin:0.25rem 0 0">{{ cobertura.asignados }}</h2>
                  </div>
                  <div class="tarjeta">
                    <span class="small muted">Trabajadores que cubren la zona</span>
                    <h2 style="margin:0.25rem 0 0">{{ cobertura.total_cubren }}</h2>
                  </div>
                </div>

                @if (cobertura.trabajadores.length === 0) {
                  <div class="tarjeta centrado mt-2">
                    <p class="muted">Ningún trabajador cubre esta zona actualmente.</p>
                  </div>
                } @else {
                  <div class="tabla-responsive mt-2">
                    <table class="tabla">
                      <thead>
                        <tr>
                          <th>Trabajador</th>
                          <th>Distancia</th>
                          <th>Motivo</th>
                          <th>Especialidades</th>
                          <th>Promedio</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (trabajador of cobertura.trabajadores; track trabajador.id) {
                          <tr>
                            <td>{{ trabajador.nombre_completo }}</td>
                            <td>{{ trabajador.distancia }}</td>
                            <td class="small">{{ etiquetaMotivo(trabajador.motivo) }}</td>
                            <td class="small">{{ trabajador.especialidades.join(', ') }}</td>
                            <td>{{ trabajador.promedio.toFixed(2) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              }
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class ZonasAdmin implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly zonas = signal<ZonaAdmin[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected nuevaZona = { nombre: '', otb: '', municipio: '', zonas_vecinas: [] as string[] };
  protected readonly zonasVecinasTexto = signal('');
  protected readonly creando = signal(false);

  protected readonly mostrarEditar = signal<ZonaAdmin | null>(null);
  protected readonly editNombre = signal('');
  protected readonly editOtb = signal('');
  protected readonly editMunicipio = signal('');
  protected readonly editVecinas = signal('');
  protected readonly guardandoEdicion = signal(false);
  protected readonly errorEdicion = signal('');
  protected readonly accionEnCurso = signal<number | null>(null);

  protected readonly cobertura = signal<CoberturaZona | null>(null);
  protected readonly cargandoCobertura = signal(false);
  protected readonly errorCobertura = signal('');

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.zonas.set(await this.adminService.listarZonas());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async crear(): Promise<void> {
    const z = this.nuevaZona;
    if (!z.nombre.trim() || !z.otb.trim() || !z.municipio.trim()) return;

    this.creando.set(true);
    try {
      const vecinas = this.zonasVecinasTexto()
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      await this.adminService.crearZona({
        nombre: z.nombre.trim(),
        otb: z.otb.trim(),
        municipio: z.municipio.trim(),
        zonas_vecinas: vecinas.length ? vecinas : undefined,
      });
      this.toast.exito('Zona creada correctamente.');
      this.nuevaZona = { nombre: '', otb: '', municipio: '', zonas_vecinas: [] };
      this.zonasVecinasTexto.set('');
      await this.cargar();
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.creando.set(false);
    }
  }

  protected async eliminar(z: ZonaAdmin): Promise<void> {
    if (!confirm(`¿Eliminar la zona "${z.nombre}"?`)) return;

    this.accionEnCurso.set(z.id);
    try {
      await this.adminService.eliminarZona(z.id);
      this.toast.exito('Zona eliminada.');
      await this.cargar();
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.accionEnCurso.set(null);
    }
  }

  protected editar(z: ZonaAdmin): void {
    this.editNombre.set(z.nombre);
    this.editOtb.set(z.otb);
    this.editMunicipio.set(z.municipio);
    this.editVecinas.set(z.zonas_vecinas.join(', '));
    this.mostrarEditar.set(z);
  }

  protected cerrarEditar(): void {
    if (!this.guardandoEdicion()) {
      this.mostrarEditar.set(null);
      this.errorEdicion.set('');
    }
  }

  protected async guardarEdicion(): Promise<void> {
    const z = this.mostrarEditar();
    if (!z) return;

    this.guardandoEdicion.set(true);
    this.errorEdicion.set('');
    try {
      const vecinas = this.editVecinas()
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      await this.adminService.actualizarZona(z.id, {
        nombre: this.editNombre().trim() || undefined,
        otb: this.editOtb().trim() || undefined,
        municipio: this.editMunicipio().trim() || undefined,
        zonas_vecinas: vecinas.length ? vecinas : undefined,
      });
      this.toast.exito('Zona actualizada.');
      this.cerrarEditar();
      await this.cargar();
    } catch (error) {
      this.errorEdicion.set(mensajeDeError(error));
    } finally {
      this.guardandoEdicion.set(false);
    }
  }

  protected async cambiarEstado(z: ZonaAdmin): Promise<void> {
    const mensaje = z.activa
      ? `¿Desactivar la zona "${z.nombre}"? Ya no aceptará nuevas solicitudes ni ofertas.`
      : `¿Activar la zona "${z.nombre}"?`;
    if (!confirm(mensaje)) return;

    this.accionEnCurso.set(z.id);
    try {
      const actualizada = await this.adminService.cambiarEstadoZona(z.id, !z.activa);
      this.zonas.update((zonas) =>
        zonas.map((item) => (item.id === actualizada.id ? actualizada : item)),
      );
      this.toast.exito(actualizada.activa ? 'Zona activada.' : 'Zona desactivada.');
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.accionEnCurso.set(null);
    }
  }

  protected async verCobertura(z: ZonaAdmin): Promise<void> {
    this.cobertura.set({
      zona: z,
      asignados: z.trabajadores_asignados,
      total_cubren: 0,
      trabajadores: [],
    });
    this.cargandoCobertura.set(true);
    this.errorCobertura.set('');
    try {
      this.cobertura.set(await this.adminService.coberturaZona(z.id));
    } catch (error) {
      this.errorCobertura.set(mensajeDeError(error));
    } finally {
      this.cargandoCobertura.set(false);
    }
  }

  protected cerrarCobertura(): void {
    if (!this.cargandoCobertura()) {
      this.cobertura.set(null);
      this.errorCobertura.set('');
    }
  }

  protected etiquetaMotivo(motivo: string): string {
    const etiquetas: Record<string, string> = {
      ZONA_EXACTA: 'Zona exacta',
      MISMA_OTB: 'Misma OTB',
      MISMO_NOMBRE: 'Mismo nombre',
      ZONA_VECINA: 'Zona vecina',
    };
    return etiquetas[motivo] ?? motivo;
  }
}
