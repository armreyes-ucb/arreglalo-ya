import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  claseTonoTrabajador,
  etiquetaEstadoTrabajador,
} from '../../core/catalogos';
import { mensajeDeError } from '../../core/errores';
import type { PerfilTrabajadorPropio, PausaTrabajador as PausaTrabajadorModel } from '../../core/models';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { ToastService } from '../../core/toast.service';
import { FechaPipe } from '../../shared/pipes';

@Component({
  selector: 'app-pausa-trabajador',
  imports: [CommonModule, FechaPipe],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Trabajador</span>
            <h1>Pausar mi cuenta</h1>
            <p>
              Puedes pausar tu cuenta de trabajador hasta 30 días. No aparecerás
              en búsquedas ni recibirás ofertas. Si pasan 60 días sin
              reactivar, se da de baja tu rol (no es una sanción).
            </p>
          </div>
          <a routerLink="/trabajador" class="btn btn--contorno"
            >Volver al panel</a
          >
        </div>

        @if (cargando()) {
          <div class="cargando">
            <span class="girador"></span>
            Cargando tu perfil…
          </div>
        } @else if (error()) {
          <div class="alerta alerta--error">
            <span>{{ error() }}</span>
          </div>
        } @else if (perfil(); as p) {
          <div class="tarjeta mb-2">
            <div class="fila fila--separada">
              <div>
                <h2 style="margin:0">{{ p.nombre_completo }}</h2>
                <span
                  class="insignia"
                  [class]="
                    'insignia ' + claseTono(p.estado)
                  "
                >
                  {{ etiquetaEstadoTrabajador(p.estado) }}
                </span>
              </div>
            </div>
          </div>

          @if (p.estado === 'SUSPENDIDO' || p.estado === 'BAJA') {
            <div class="alerta alerta--error">
              <span
                >No puedes pausar una cuenta {{ p.estado === 'SUSPENDIDO' ? 'suspendida' : 'dada de baja' }}.</span
              >
            </div>
          }

          @if (p.estado !== 'SUSPENDIDO' && p.estado !== 'BAJA') {
            <div class="tarjeta mb-2">
              <h2>Estado de la pausa</h2>
              <div class="rejilla rejilla--3 mt-2">
                <div class="estadistica">
                  <span class="estadistica__texto"
                    >{{ pausa().pausado ? 'En pausa' : 'Activa' }}</span
                  >
                  <span class="estadistica__valor">{{
                    pausa().pausado ? 'SÍ' : 'NO'
                  }}</span>
                  <span class="small muted">
                    {{ pausa().pausado ? 'No recibes ofertas' : 'Recibes trabajos' }}
                  </span>
                </div>
                @if (pausa().pausado) {
                  <div class="estadistica">
                    <span class="estadistica__texto">Días restantes</span>
                    <span class="estadistica__valor">{{
                      pausa().dias_restantes ?? '—'
                    }}</span>
                    <span class="small muted">
                      {{ pausa().estado }} ·
                      {{ pausa().vence_en | fecha }}
                    </span>
                  </div>
                  <div class="estadistica">
                    <span class="estadistica__texto">Baja automática</span>
                    <span class="estadistica__valor">{{
                      pausa().baja_en ? (pausa().baja_en | fecha) : '—'
                    }}</span>
                    <span class="small muted">
                      {{ pausa().estado === 'BAJA' ? 'Ya dada de baja' : 'Si no reactivas' }}
                    </span>
                  </div>
                }
              </div>
            </div>

            @if (pausa().aviso) {
              <div class="alerta alerta--aviso mb-2">
                <span
                  >¡Atención! Tu pausa vence en {{ pausa().dias_restantes }} día(s).
                  Reactiva tu cuenta para no perder el rol de trabajador.</span
                >
              </div>
            }

            @if (!pausa().pausado) {
              <div class="tarjeta">
                <h2>Pausar mi cuenta</h2>
                <p class="small muted mt-1">
                  Durante la pausa no aparecerás en búsquedas ni recibirás ofertas.
                  Puedes reactivarte en cualquier momento antes de los 30 días.
                </p>
                <button
                  type="button"
                  class="btn btn--ambar btn--bloque mt-2"
                  [disabled]="pausando()"
                  (click)="pausar()"
                >
                  {{ pausando() ? 'Pausando…' : 'Pausar mi cuenta (30 días)' }}
                </button>
              </div>
            } @else {
              <div class="tarjeta">
                <h2>Reactivar mi cuenta</h2>
                <p class="small muted mt-1">
                  Volverás a aparecer en búsquedas y recibir ofertas
                  inmediatamente.
                </p>
                <button
                  type="button"
                  class="btn btn--primario btn--bloque mt-2"
                  [disabled]="pausando()"
                  (click)="reactivar()"
                >
                  {{ pausando() ? 'Reactivando…' : 'Reactivar mi cuenta' }}
                </button>
              </div>
            }

            @if (errorPausa()) {
              <div class="alerta alerta--error mt-2">
                <span>{{ errorPausa() }}</span>
              </div>
            }
          }
        }
      </div>
    </section>
  `,
})
export class PausaTrabajador implements OnInit {
  private readonly trabajadoresService = inject(TrabajadoresService);
  private readonly toast = inject(ToastService);

  protected readonly perfil = signal<PerfilTrabajadorPropio | null>(null);
  protected readonly pausa = signal<PausaTrabajadorModel>({
    pausado: false,
    estado: null,
    inicio: null,
    vence_en: null,
    dias_restantes: null,
    aviso: false,
    baja_en: null,
  });
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly pausando = signal(false);
  protected readonly errorPausa = signal('');
  protected readonly etiquetaEstadoTrabajador = etiquetaEstadoTrabajador;
  protected readonly claseTono = claseTonoTrabajador;

  ngOnInit(): void {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const p = await this.trabajadoresService.perfilPropio();
      this.perfil.set(p);
      this.pausa.set(p.pausa);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  protected async pausar(): Promise<void> {
    this.errorPausa.set('');
    this.pausando.set(true);
    try {
      const actualizado = await this.trabajadoresService.cambiarPausa({
        accion: 'PAUSAR',
      });
      this.perfil.set(actualizado);
      this.pausa.set(actualizado.pausa);
      this.toast.exito('Cuenta pausada. Tienes 30 días para reactivarla.');
    } catch (error) {
      this.errorPausa.set(mensajeDeError(error));
    } finally {
      this.pausando.set(false);
    }
  }

  protected async reactivar(): Promise<void> {
    this.errorPausa.set('');
    this.pausando.set(true);
    try {
      const actualizado = await this.trabajadoresService.cambiarPausa({
        accion: 'REACTIVAR',
      });
      this.perfil.set(actualizado);
      this.pausa.set(actualizado.pausa);
      this.toast.exito('Cuenta reactivada. Ya recibes ofertas de nuevo.');
    } catch (error) {
      this.errorPausa.set(mensajeDeError(error));
    } finally {
      this.pausando.set(false);
    }
  }
}