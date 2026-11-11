import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-panel-admin',
  imports: [RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Administración</span>
            <h1>Panel de administración</h1>
            <p>
              Hola,
              {{ auth.usuario()?.nombre_completo }}. Este panel
              concentrará la configuración y los reportes de la
              plataforma.
            </p>
          </div>
          <a
            routerLink="/supervisor/verificaciones"
            class="btn btn--contorno"
            >Ir a verificaciones</a
          >
        </div>

        <div class="alerta alerta--info">
          <span>
            Los módulos de configuración, reportes, suspensiones y
            gestión de usuarios se implementan en el siguiente
            sprint del proyecto.
          </span>
        </div>

        <div class="rejilla rejilla--3">
          <div class="tarjeta">
            <h3>Gestión de usuarios</h3>
            <p class="small muted">
              Consulta de cuentas, roles y estados. Próximamente.
            </p>
            <span class="insignia insignia--neutro"
              >Próximo sprint</span
            >
          </div>
          <div class="tarjeta">
            <h3>Reportes y métricas</h3>
            <p class="small muted">
              Solicitudes, ingresos, comisiones y tiempos de
              atención. Próximamente.
            </p>
            <span class="insignia insignia--neutro"
              >Próximo sprint</span
            >
          </div>
          <div class="tarjeta">
            <h3>Suspensiones y apelaciones</h3>
            <p class="small muted">
              Serie de Fibonacci y seguimiento de casos.
              Próximamente.
            </p>
            <span class="insignia insignia--neutro"
              >Próximo sprint</span
            >
          </div>
          <div class="tarjeta">
            <h3>Parámetros de la plataforma</h3>
            <p class="small muted">
              Comisión, redondeo y plazos de cancelación.
              Próximamente.
            </p>
            <span class="insignia insignia--neutro"
              >Próximo sprint</span
            >
          </div>
          <div class="tarjeta">
            <h3>Zonas y especialidades</h3>
            <p class="small muted">
              Administración del catálogo geográfico y de oficios.
              Próximamente.
            </p>
            <span class="insignia insignia--neutro"
              >Próximo sprint</span
            >
          </div>
          <div class="tarjeta">
            <h3>Verificaciones</h3>
            <p class="small muted">
              Acceso directo a la bandeja de expedientes de
              trabajadores.
            </p>
            <a
              routerLink="/supervisor/verificaciones"
              class="btn btn--primario btn--sm"
              >Abrir bandeja</a
            >
          </div>
        </div>
      </div>
    </section>
  `,
})
export class PanelAdmin {
  protected readonly auth = inject(AuthService);
}
