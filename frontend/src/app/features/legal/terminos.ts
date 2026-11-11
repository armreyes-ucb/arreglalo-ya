import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terminos',
  imports: [RouterLink],
  template: `
    <section class="pagina">
      <div class="contenedor pagina--estrecha">
        <div class="cabecera-pagina">
          <div>
            <span class="migaja">Arréglalo Ya · Legal</span>
            <h1>Términos y condiciones</h1>
            <p>
              Última actualización: noviembre de 2026. Estas reglas
              aplican a clientes, trabajadores y supervisores de la
              plataforma.
            </p>
          </div>
        </div>

        <article class="tarjeta pila">
          <section>
            <h2>1. Qué es Arréglalo Ya</h2>
            <p>
              Es una plataforma que conecta a personas que necesitan
              un arreglo en el hogar con trabajadores independientes
              verificados. Arréglalo Ya no ejecuta los trabajos: los
              servicios son prestados directamente por cada
              trabajador.
            </p>
          </section>

          <section>
            <h2>2. Registro y roles</h2>
            <p>
              Para publicar solicitudes debes registrarte como
              cliente con tu teléfono. Un cliente puede activar
              además el rol de trabajador. Los roles de supervisor y
              administrador son asignados por la plataforma.
            </p>
          </section>

          <section>
            <h2>3. Publicación de solicitudes</h2>
            <p>
              Debes describir el problema con sinceridad, incluir
              fotos y una dirección válida. Las solicitudes urgentes
              se muestran primero y su precio de referencia se
              incrementa en un 10%; el monto final siempre se acuerda
              mediante las ofertas.
            </p>
          </section>

          <section>
            <h2>4. Ofertas y confirmación</h2>
            <p>
              Solo pueden ofertar trabajadores activos, con
              verificación de niveles 1 y 2 aprobada, cuenta bancaria
              registrada y antecedentes vigentes. El cliente elige
              una oferta; para confirmar el trabajo debe pagar el 25%
              del total mediante código QR. La dirección exacta y el
              contacto por WhatsApp se revelan únicamente cuando la
              solicitud está confirmada.
            </p>
          </section>

          <section>
            <h2>5. Dinero, redondeo y comisión</h2>
            <ul>
              <li>
                Todos los montos se redondean a Bs 0,50.
              </li>
              <li>
                El pago inicial es el 25% del total acordado.
              </li>
              <li>
                La comisión de la plataforma es del 5% y se descuenta
                de ese pago inicial.
              </li>
              <li>
                El saldo restante se cancela en persona al concluir
                el trabajo.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Cancelaciones y devoluciones</h2>
            <p>
              Puedes cancelar sin penalidad si faltan 2 horas o más
              para la cita. Las devoluciones se procesan en un plazo
              máximo de 3 días hábiles al medio de pago original.
            </p>
          </section>

          <section>
            <h2>7. Verificación de trabajadores</h2>
            <p>
              Los trabajadores cargan carnet de identidad, selfie,
              certificado REJAP y certificado de especialidad. Un
              supervisor revisa el expediente. Los antecedentes
              penales deben mantenerse vigentes. Las suspensiones por
              incumplimientos siguen la serie de Fibonacci: 1, 2, 3,
              5, 8, 13 y 21 días.
            </p>
          </section>

          <section>
            <h2>8. Conducta y datos personales</h2>
            <p>
              Está prohibido compartir datos de contacto antes de la
              confirmación, ofrecer servicios fuera de la plataforma
              o usar la información de otros usuarios para fines
              distintos al trabajo acordado. Los datos se usan para
              operar el servicio y se tratan de forma confidencial.
            </p>
          </section>

          <section>
            <h2>9. Contacto</h2>
            <p>
              Para consultas sobre estos términos escribe a
              soporte&#64;arreglaloya.bo.
            </p>
          </section>

          <a routerLink="/registro" class="btn btn--primario">
            Volver al registro
          </a>
        </article>
      </div>
    </section>
  `,
})
export class Terminos {}
