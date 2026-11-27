/**
 * Utilidades para devoluciones parciales. Se trabaja en centavos para evitar
 * errores de punto flotante al acumular montos (por ejemplo 0.1 + 0.2).
 */

export function aCentavos(monto: number): number {
  return Math.round(monto * 100);
}

export function desdeCentavos(centavos: number): number {
  return centavos / 100;
}

export function redondearMonto(monto: number): number {
  return desdeCentavos(Math.round(monto * 100));
}

export interface SaldoDevoluciones {
  /** Suma de todas las devoluciones registradas para el pago. */
  totalDevuelto: number;
  /** Importe que todavía se puede devolver. */
  saldoDisponible: number;
}

/**
 * Calcula el acumulado y el saldo de un pago a partir del importe original
 * (pago inicial del 25%) y de los montos de sus devoluciones.
 *
 * El saldo nunca es negativo: si por datos históricos el acumulado superara
 * el original, se reporta 0.
 */
export function calcularSaldoDevoluciones(
  montoOriginal: number,
  montos: number[],
): SaldoDevoluciones {
  const originalCentavos = aCentavos(montoOriginal);
  const totalCentavos = montos.reduce(
    (acumulado, monto) => acumulado + aCentavos(monto),
    0,
  );

  return {
    totalDevuelto: desdeCentavos(totalCentavos),
    saldoDisponible: desdeCentavos(
      Math.max(0, originalCentavos - totalCentavos),
    ),
  };
}
