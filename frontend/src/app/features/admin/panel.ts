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

        <div class="rejilla rejilla--4 seccion">
          <div class="tarjeta">
            <h3>Supervisores</h3>
            <p class="small muted">CRUD y contraseñas temporales</p>
            <a routerLink="/admin/supervisores" class="btn btn--contorno btn--sm mt-1">Gestionar supervisores</a>
          </div>
          <div class="tarjeta">
            <h3>Zonas y especialidades</h3>
            <p class="small muted">Catálogo geográfico y oficios</p>
            <a routerLink="/admin/zonas" class="btn btn--contorno btn--sm mt-1">Gestionar zonas</a>
          </div>
          <div class="tarjeta">
            <h3>Parámetros de la plataforma</h3>
            <p class="small muted">Comisión, redondeo, plazos</p>
            <a routerLink="/admin/configuracion" class="btn btn--contorno btn--sm mt-1">Configurar</a>
          </div>
          <div class="tarjeta">
            <h3>Reportes</h3>
            <p class="small muted">Solicitudes, ingresos, comisiones</p>
            <a routerLink="/admin/reportes" class="btn btn--contorno btn--sm mt-1">Ver reportes</a>
          </div>
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
    </section>
  `,
})
export class PanelAdmin {
  protected readonly auth = inject(AuthService);
}
