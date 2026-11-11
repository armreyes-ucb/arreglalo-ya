import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sin-acceso',
  imports: [RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor pagina--estrecha">
        <div class="tarjeta centrado">
          <div class="vacio__icono">!</div>
          <h1>Esta sección no está disponible para tu rol</h1>
          <p class="muted">
            Cambia de rol desde la barra superior o vuelve a tu
            panel para continuar.
          </p>
          <a routerLink="/" class="btn btn--primario mt-2">
            Volver al inicio
          </a>
        </div>
      </div>
    </section>
  `,
})
export class SinAcceso {}
