import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  template: `
    <footer class="pie">
      <div class="contenedor pie__inner">
        <div class="pie__marca">
          <strong>Arréglalo Ya</strong>
          <p class="small">
            Conectamos clientes con técnicos verificados de tu zona.
            Pago seguro con QR y trabajadores revisados.
          </p>
        </div>
        <nav class="pie__enlaces" aria-label="Enlaces del pie">
          <a routerLink="/">Inicio</a>
          <a routerLink="/activar-trabajador">Quiero trabajar</a>
          <a routerLink="/terminos">Términos y condiciones</a>
          <a routerLink="/login">Ingresar</a>
          <a routerLink="/registro">Crear cuenta</a>
        </nav>
        <p class="small muted pie__legal">
          Proyecto académico de Sistemas de Información. La Paz,
          Bolivia.
        </p>
      </div>
    </footer>
  `,
})
export class Footer {}
