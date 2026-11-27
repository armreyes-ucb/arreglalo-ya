import { EstadoClienteConflictivo } from '../../common/enums/estado-cliente-conflictivo.enum.js';

interface CasoAdvertencia {
  estado: EstadoClienteConflictivo;
  reportesComprobados: number;
}

/**
 * RF32: regla única de advertencia al trabajador.
 *
 * - `CONFIRMADO` siempre advierte.
 * - `DESESTIMADO` nunca advierte.
 * - Un caso `POTENCIAL` solo advierte por reportes comprobados que alcanzan
 *   el umbral configurable (compatibilidad con la regla histórica de 3
 *   reportes). Reclamos o cancelaciones sin confirmar no advierten.
 */
export function debeAdvertirCliente(
  caso: CasoAdvertencia,
  umbralReportes: number,
): boolean {
  if (caso.estado === EstadoClienteConflictivo.DESESTIMADO) {
    return false;
  }
  if (caso.estado === EstadoClienteConflictivo.CONFIRMADO) {
    return true;
  }
  return (
    umbralReportes > 0 && caso.reportesComprobados >= umbralReportes
  );
}

/** Construye el conjunto de clientes que deben advertirse. */
export function construirClientesAdvertidos<
  T extends CasoAdvertencia & { clienteId: string },
>(casos: readonly T[], umbralReportes: number): Set<string> {
  return new Set(
    casos
      .filter((caso) => debeAdvertirCliente(caso, umbralReportes))
      .map((caso) => caso.clienteId),
  );
}
