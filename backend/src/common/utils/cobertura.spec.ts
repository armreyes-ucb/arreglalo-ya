import { describe, expect, it } from 'vitest';
import type { Zona } from '../../entities/zona.entity.js';
import { calcularDistancia, evaluarCobertura } from './cobertura.js';

function crearZona(
  id: number,
  nombre: string,
  otb: string,
  zonasVecinas: string[] = [],
): Zona {
  return {
    id,
    nombre,
    otb,
    municipio: 'Cercado',
    zonasVecinas,
    activa: true,
  };
}

describe('cobertura geográfica', () => {
  it('distancia 0 cuando la zona es exactamente la misma', () => {
    const buscada = crearZona(3, 'Centro', 'OTB Centro');
    const resultado = evaluarCobertura(buscada, [buscada]);

    expect(resultado).toEqual({ distancia: 0, motivo: 'ZONA_EXACTA' });
  });

  it('distancia 0 cuando comparte la misma OTB', () => {
    const buscada = crearZona(3, 'Centro', 'OTB Centro');
    const trabajador = crearZona(8, 'Centro Ampliación', 'OTB Centro');

    expect(evaluarCobertura(buscada, [trabajador])).toEqual({
      distancia: 0,
      motivo: 'MISMA_OTB',
    });
  });

  it('distancia 1 cuando comparte nombre en otra OTB', () => {
    const buscada = crearZona(3, 'Centro', 'OTB Centro');
    const trabajador = crearZona(8, 'Centro', 'OTB Centro Norte');

    expect(evaluarCobertura(buscada, [trabajador])).toEqual({
      distancia: 1,
      motivo: 'MISMO_NOMBRE',
    });
  });

  it('distancia 2 cuando la zona del trabajador es vecina de la buscada', () => {
    const buscada = crearZona(3, 'Centro', 'OTB Centro', ['Norte']);
    const trabajador = crearZona(1, 'Norte', 'OTB Norte');

    expect(calcularDistancia(buscada, [trabajador])).toBe(2);
  });

  it('null cuando ninguna zona del trabajador cubre la solicitada', () => {
    const buscada = crearZona(3, 'Centro', 'OTB Centro');
    const trabajador = crearZona(9, 'Sur', 'OTB Sur');

    expect(evaluarCobertura(buscada, [trabajador])).toEqual({
      distancia: null,
      motivo: null,
    });
  });

  it('null cuando el trabajador no tiene zonas', () => {
    const buscada = crearZona(3, 'Centro', 'OTB Centro');

    expect(calcularDistancia(buscada, [])).toBeNull();
  });
});
