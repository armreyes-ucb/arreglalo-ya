import type { Zona } from '../../entities/zona.entity.js';

export type MotivoCobertura =
  | 'ZONA_EXACTA'
  | 'MISMA_OTB'
  | 'MISMO_NOMBRE'
  | 'ZONA_VECINA';

export interface ResultadoCobertura {
  distancia: number | null;
  motivo: MotivoCobertura | null;
}

/**
 * Regla única de cobertura geográfica (RN de cercanía).
 * Distancias 0, 1 y 2 son cobertura normal; null es fuera de cobertura.
 */
export function evaluarCobertura(
  zonaBuscada: Zona,
  zonasTrabajador: Zona[],
): ResultadoCobertura {
  if (zonasTrabajador.some((zona) => zona.id === zonaBuscada.id)) {
    return { distancia: 0, motivo: 'ZONA_EXACTA' };
  }
  if (zonasTrabajador.some((zona) => zona.otb === zonaBuscada.otb)) {
    return { distancia: 0, motivo: 'MISMA_OTB' };
  }
  if (zonasTrabajador.some((zona) => zona.nombre === zonaBuscada.nombre)) {
    return { distancia: 1, motivo: 'MISMO_NOMBRE' };
  }
  if (
    zonasTrabajador.some((zona) =>
      zonaBuscada.zonasVecinas.includes(zona.nombre),
    )
  ) {
    return { distancia: 2, motivo: 'ZONA_VECINA' };
  }
  return { distancia: null, motivo: null };
}

export function calcularDistancia(
  zonaBuscada: Zona,
  zonasTrabajador: Zona[],
): number | null {
  return evaluarCobertura(zonaBuscada, zonasTrabajador).distancia;
}
