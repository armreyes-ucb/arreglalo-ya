import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  ESPECIALIDADES,
  panelDeRol,
} from '../../core/catalogos';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="contenedor hero__inner">
        <div>
          <span class="insignia insignia--ambar">
            Técnicos verificados en La Paz
          </span>
          <h1 class="mt-2">
            Tu problema del hogar,
            <span>resuelto hoy</span>.
          </h1>
          <p>
            Publica lo que necesitas y recibe ofertas de técnicos
            revisados de tu zona. Paga solo el 25% por QR para
            confirmar y el resto en persona.
          </p>
          <div class="hero__acciones">
            @if (auth.autenticado()) {
              <a
                [routerLink]="rutaPrincipal()"
                class="btn btn--ambar btn--lg"
              >
                Ir a mi panel
              </a>
              @if (auth.rolActivo() === 'CLIENTE') {
                <a
                  routerLink="/cliente/publicar"
                  class="btn btn--claro btn--lg"
                >
                  Publicar una solicitud
                </a>
              }
            } @else {
              <a
                routerLink="/registro"
                class="btn btn--ambar btn--lg"
              >
                Crear mi cuenta
              </a>
              <a
                routerLink="/login"
                class="btn btn--claro btn--lg"
              >
                Ya tengo cuenta
              </a>
            }
          </div>
        </div>

        <div class="hero__panel">
          <div class="hero__item">
            <span class="hero__punto">1</span>
            <div>
              <strong>Publica tu solicitud</strong>
              <span>Cuéntanos el problema y tu zona.</span>
            </div>
          </div>
          <div class="hero__item">
            <span class="hero__punto">2</span>
            <div>
              <strong>Compara ofertas</strong>
              <span>Recibe precios y fechas de técnicos.</span>
            </div>
          </div>
          <div class="hero__item">
            <span class="hero__punto">3</span>
            <div>
              <strong>Confirma con QR</strong>
              <span>Paga el 25% y coordinamos el trabajo.</span>
            </div>
          </div>
          <div class="hero__item">
            <span class="hero__punto">4</span>
            <div>
              <strong>Califica el trabajo</strong>
              <span>Tu opinión ayuda a toda la comunidad.</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="pagina">
      <div class="contenedor">
        <div class="tarjeta tarjeta--destacada">
          <div class="rejilla rejilla--2">
            <div>
              <span class="insignia insignia--ambar">
                Para técnicos
              </span>
              <h2 class="mt-2">¿Eres técnico? Quiero trabajar</h2>
              <p class="muted">
                Suma tus servicios a Arréglalo Ya, recibe
                solicitudes de tu zona y cobra de forma segura.
              </p>
              <a
                [routerLink]="rutaTrabajo()"
                class="btn btn--primario mt-2"
              >
                {{ etiquetaTrabajo() }}
              </a>
            </div>
            <ul class="pila" style="padding-left: 1.1rem">
              <li>
                <strong>Elige tus zonas y especialidades.</strong>
                Tú decides dónde y qué servicios ofreces.
              </li>
              <li>
                <strong>Verificación clara.</strong> Revisamos tus
                documentos para generar confianza en los clientes.
              </li>
              <li>
                <strong>Pago seguro.</strong> Recibes el adelanto por
                QR y el saldo directamente del cliente.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="pagina">
      <div class="contenedor">
        <div class="seccion">
          <div class="cabecera-pagina">
            <div>
              <h2>Especialidades disponibles</h2>
              <p>
                Elige el tipo de técnico que necesitas. Todos pasan
                por verificación de identidad y antecedentes.
              </p>
            </div>
          </div>
          <div class="rejilla rejilla--4">
            @for (especialidad of especialidades; track especialidad.valor) {
              <a
                [routerLink]="auth.autenticado() ? '/cliente/buscar' : '/registro'"
                class="tarjeta-especialidad"
              >
                <span class="monograma">{{
                  especialidad.monograma
                }}</span>
                <strong>{{ especialidad.etiqueta }}</strong>
                <span class="small muted">{{
                  especialidad.descripcion
                }}</span>
              </a>
            }
          </div>
        </div>

        <div class="rejilla rejilla--2 seccion">
          <div class="tarjeta">
            <h3>Así funciona</h3>
            <div class="pila mt-2">
              <div class="fila fila--arriba">
                <span class="numero-paso">1</span>
                <div>
                  <strong>Describe el problema</strong>
                  <p class="small muted">
                    Especialidad, zona, fotos y fecha preferida.
                  </p>
                </div>
              </div>
              <div class="fila fila--arriba">
                <span class="numero-paso">2</span>
                <div>
                  <strong>Recibe ofertas</strong>
                  <p class="small muted">
                    Los técnicos elegibles envían su precio y
                    disponibilidad.
                  </p>
                </div>
              </div>
              <div class="fila fila--arriba">
                <span class="numero-paso">3</span>
                <div>
                  <strong>Confirma y coordina</strong>
                  <p class="small muted">
                    Con el pago inicial por QR se revelan los datos
                    de contacto.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="tarjeta">
            <h3>Seguridad para las dos partes</h3>
            <ul class="pila mt-2" style="padding-left: 1.1rem">
              <li>
                <strong>Verificación obligatoria.</strong> Carnet,
                selfie, REJAP y certificado revisados por un
                supervisor.
              </li>
              <li>
                <strong>Pago inicial del 25%.</strong> El saldo se
                cancela en persona y se redondea a Bs 0,50.
              </li>
              <li>
                <strong>Cancelación justa.</strong> Sin penalidad si
                avisas con 2 horas o más de anticipación.
              </li>
              <li>
                <strong>Tu dirección es privada.</strong> Solo se
                revela cuando la solicitud está confirmada.
              </li>
            </ul>
          </div>
        </div>

        <div class="tarjeta tarjeta--destacada centrado">
          <h2>¿Listo para resolverlo?</h2>
          <p>
            Crea tu cuenta gratuita, publica tu solicitud y recibe
            ofertas de técnicos de tu zona.
          </p>
          <div class="fila" style="justify-content: center">
            @if (auth.autenticado()) {
              <a
                [routerLink]="rutaPrincipal()"
                class="btn btn--ambar"
              >
                Continuar en mi panel
              </a>
            } @else {
              <a routerLink="/registro" class="btn btn--ambar">
                Crear cuenta gratis
              </a>
              <a routerLink="/terminos" class="btn btn--claro">
                Leer los términos
              </a>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);
  protected readonly especialidades = ESPECIALIDADES;
  protected readonly rutaPrincipal = computed(() => {
    const rol = this.auth.rolActivo();
    return rol ? panelDeRol(rol) : '/';
  });
  protected readonly esTrabajador = computed(() =>
    this.auth.roles().includes('TRABAJADOR'),
  );
  protected readonly rutaTrabajo = computed(() =>
    this.esTrabajador() ? '/trabajador' : '/activar-trabajador',
  );
  protected readonly etiquetaTrabajo = computed(() =>
    this.esTrabajador()
      ? 'Ir a mi panel de trabajador'
      : 'Quiero trabajar',
  );
}
