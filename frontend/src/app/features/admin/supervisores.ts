import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mensajeDeError } from '../../core/errores';
import type { UsuarioPublico, SupervisorCreado } from '../../core/models';
import { AdminService } from '../../core/admin.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-supervisores-admin',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Administración</span>
            <h1>Gestión de supervisores</h1>
            <p>Crea, edita y desactiva cuentas de supervisor. Solo SUPERADMIN.</p>
          </div>
          <a routerLink="/admin" class="btn btn--contorno">Volver al panel</a>
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando supervisores…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else {
          <div class="tarjeta mb-2">
            <h2>Crear supervisor</h2>
            <p class="small muted mt-1">
              Si el teléfono ya existe, se promociona a supervisor. Se genera contraseña temporal si
              es nueva cuenta.
            </p>
            <div class="formulario--rejilla mt-2">
              <div class="campo">
                <label class="etiqueta" for="telefono">Teléfono *</label>
                <input
                  id="telefono"
                  type="tel"
                  class="input"
                  [(ngModel)]="nuevoSupervisor.telefono"
                  placeholder="+591 7xxxxxxx"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="nombre_completo">Nombre completo</label>
                <input
                  id="nombre_completo"
                  type="text"
                  class="input"
                  [(ngModel)]="nuevoSupervisor.nombre_completo"
                  placeholder="Opcional"
                />
              </div>
              <div class="campo">
                <label class="etiqueta" for="password">Contraseña</label>
                <input
                  id="password"
                  type="password"
                  class="input"
                  [(ngModel)]="nuevoSupervisor.password"
                  placeholder="Opcional (mín. 8 caracteres)"
                />
              </div>
            </div>
            <button
              type="button"
              class="btn btn--primario mt-2"
              [disabled]="creando() || !nuevoSupervisor.telefono.trim()"
              (click)="crear()"
            >
              {{ creando() ? 'Creando…' : 'Crear supervisor' }}
            </button>
            @if (ultimoCreado()) {
              <div class="alerta alerta--exito mt-2">
                <span>
                  Supervisor creado:
                  <strong>{{ ultimoCreado()!.supervisor.nombre_completo }}</strong>
                  @if (ultimoCreado()!.password_temporal) {
                    <span class="small muted ml-2"
                      >| Contraseña temporal:
                      <strong>{{ ultimoCreado()!.password_temporal }}</strong></span
                    >
                  }
                  @if (!ultimoCreado()!.creado) {
                    <span class="small muted ml-2">(Cuenta existente promocionada)</span>
                  }
                </span>
              </div>
            }
          </div>

          @if (supervisores().length === 0) {
            <div class="tarjeta centrado">
              <div class="vacio__icono">👥</div>
              <h2>No hay supervisores registrados</h2>
              <p class="muted">Crea el primero usando el formulario de arriba.</p>
            </div>
          } @else {
            <div class="tarjeta">
              <h2>Supervisores existentes</h2>
              <div class="tabla-responsive mt-2">
                <table class="tabla">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Teléfono</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of supervisores(); track s.id) {
                      <tr>
                        <td>{{ s.id.slice(0, 8) }}…</td>
                        <td>{{ s.nombre_completo }}</td>
                        <td>{{ s.telefono }}</td>
                        <td>
                          <span
                            class="insignia"
                            [class]="s.estado === 'ACTIVO' ? 'insignia--verde' : 'insignia--rojo'"
                          >
                            {{ s.estado }}
                          </span>
                        </td>
                        <td>
                          <div class="fila" style="gap: 0.5rem">
                            @if (s.estado === 'ACTIVO') {
                              <button
                                type="button"
                                class="btn btn--contorno btn--sm"
                                [disabled]="accionEnCurso() === s.id"
                                (click)="desactivar(s)"
                              >
                                Desactivar
                              </button>
                            } @else {
                              <button
                                type="button"
                                class="btn btn--primario btn--sm"
                                [disabled]="accionEnCurso() === s.id"
                                (click)="reactivar(s)"
                              >
                                Reactivar
                              </button>
                            }
                            <button
                              type="button"
                              class="btn btn--contorno btn--sm"
                              [disabled]="accionEnCurso() === s.id"
                              (click)="editar(s)"
                            >
                              Editar
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

        @if (mostrarEditar(); as s) {
          <div class="modal-fondo" (click)="cerrarEditar()">
            <div class="modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
              <div class="fila fila--separada">
                <h2 style="margin:0">Editar supervisor</h2>
                <button type="button" class="enlace-boton" (click)="cerrarEditar()">Cerrar</button>
              </div>
              <div class="campo mt-2">
                <label class="etiqueta" for="edit-nombre">Nombre completo</label>
                <input
                  id="edit-nombre"
                  type="text"
                  class="input"
                  [(ngModel)]="editNombre"
                  placeholder="Nuevo nombre"
                />
              </div>
              <div class="campo mt-2">
                <label class="etiqueta" for="edit-password">Nueva contraseña (opcional)</label>
                <input
                  id="edit-password"
                  type="password"
                  class="input"
                  [(ngModel)]="editPassword"
                  placeholder="Deja vacío para no cambiar"
                />
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
      </div>
    </section>
  `,
})
export class SupervisoresAdmin implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly supervisores = signal<UsuarioPublico[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected nuevoSupervisor = { telefono: '', nombre_completo: '', password: '' };
  protected readonly creando = signal(false);
  protected readonly ultimoCreado = signal<SupervisorCreado | null>(null);

  protected readonly mostrarEditar = signal<UsuarioPublico | null>(null);
  protected readonly editNombre = signal('');
  protected readonly editPassword = signal('');
  protected readonly guardandoEdicion = signal(false);
  protected readonly errorEdicion = signal('');
  protected readonly accionEnCurso = signal<string | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.supervisores.set(await this.adminService.listarSupervisores());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async crear(): Promise<void> {
    const tel = this.nuevoSupervisor.telefono.trim();
    if (!tel) return;

    this.creando.set(true);
    this.ultimoCreado.set(null);
    try {
      const creado = await this.adminService.crearSupervisor({
        telefono: tel,
        nombre_completo: this.nuevoSupervisor.nombre_completo.trim() || undefined,
        password: this.nuevoSupervisor.password.trim() || undefined,
      });
      this.ultimoCreado.set(creado);
      this.toast.exito('Supervisor creado correctamente.');
      this.nuevoSupervisor = { telefono: '', nombre_completo: '', password: '' };
      await this.cargar();
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.creando.set(false);
    }
  }

  protected async desactivar(s: UsuarioPublico): Promise<void> {
    this.accionEnCurso.set(s.id);
    try {
      await this.adminService.desactivarSupervisor(s.id);
      this.toast.exito('Supervisor desactivado.');
      await this.cargar();
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.accionEnCurso.set(null);
    }
  }

  protected async reactivar(s: UsuarioPublico): Promise<void> {
    this.accionEnCurso.set(s.id);
    try {
      await this.adminService.reactivarSupervisor(s.id);
      this.toast.exito('Supervisor reactivado.');
      await this.cargar();
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.accionEnCurso.set(null);
    }
  }

  protected editar(s: UsuarioPublico): void {
    this.editNombre.set(s.nombre_completo);
    this.editPassword.set('');
    this.mostrarEditar.set(s);
  }

  protected cerrarEditar(): void {
    if (!this.guardandoEdicion()) {
      this.mostrarEditar.set(null);
      this.errorEdicion.set('');
    }
  }

  protected async guardarEdicion(): Promise<void> {
    const s = this.mostrarEditar();
    if (!s) return;

    this.guardandoEdicion.set(true);
    this.errorEdicion.set('');
    try {
      await this.adminService.actualizarSupervisor(s.id, {
        nombre_completo: this.editNombre().trim() || undefined,
        password: this.editPassword().trim() || undefined,
      });
      this.toast.exito('Supervisor actualizado.');
      this.cerrarEditar();
      await this.cargar();
    } catch (error) {
      this.errorEdicion.set(mensajeDeError(error));
    } finally {
      this.guardandoEdicion.set(false);
    }
  }
}
