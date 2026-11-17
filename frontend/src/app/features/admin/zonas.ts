import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mensajeDeError } from '../../core/errores';
import type { Zona } from '../../core/models';
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
            <p>
              Administra el catálogo geográfico y de oficios. Solo
              SUPERADMIN.
            </p>
          </div>
          <a routerLink="/admin" class="btn btn--contorno"
            >Volver al panel</a
          >
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
            <p class="small muted mt-1">
              Define el nombre, OTB, municipio y zonas vecinas.
            </p>
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
                        <td class="small">{{
                          z.zonas_vecinas.length ? z.zonas_vecinas.join(', ') : '—'
                        }}</td>
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
                              class="btn btn--peligro btn--sm"
                              [disabled]="accionEnCurso() === z.id"
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
            <div
              class="modal"
              role="dialog"
              aria-modal="true"
              (click)="$event.stopPropagation()"
            >
              <div class="fila fila--separada">
                <h2 style="margin:0">Editar zona</h2>
                <button
                  type="button"
                  class="enlace-boton"
                  (click)="cerrarEditar()"
                >
                  Cerrar
                </button>
              </div>
              <div class="formulario--rejilla mt-2">
                <div class="campo">
                  <label class="etiqueta" for="edit-nombre">Nombre</label>
                  <input
                    id="edit-nombre"
                    type="text"
                    class="input"
                    [(ngModel)]="editNombre"
                  />
                </div>
                <div class="campo">
                  <label class="etiqueta" for="edit-otb">OTB</label>
                  <input
                    id="edit-otb"
                    type="text"
                    class="input"
                    [(ngModel)]="editOtb"
                  />
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
                  <label class="etiqueta" for="edit-vecinas"
                    >Zonas vecinas (coma)</label
                  >
                  <input
                    id="edit-vecinas"
                    type="text"
                    class="input"
                    [(ngModel)]="editVecinas"
                  />
                </div>
              </div>
              <div class="fila mt-2" style="justify-content: flex-end">
                <button
                  type="button"
                  class="btn btn--contorno"
                  (click)="cerrarEditar()"
                >
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
      </div>
    </section>
  `,
})
export class ZonasAdmin implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly zonas = signal<Zona[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected nuevaZona = { nombre: '', otb: '', municipio: '', zonas_vecinas: [] as string[] };
  protected readonly zonasVecinasTexto = signal('');
  protected readonly creando = signal(false);

  protected readonly mostrarEditar = signal<Zona | null>(null);
  protected readonly editNombre = signal('');
  protected readonly editOtb = signal('');
  protected readonly editMunicipio = signal('');
  protected readonly editVecinas = signal('');
  protected readonly guardandoEdicion = signal(false);
  protected readonly errorEdicion = signal('');
  protected readonly accionEnCurso = signal<number | null>(null);

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

  protected async eliminar(z: Zona): Promise<void> {
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

  protected editar(z: Zona): void {
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
}