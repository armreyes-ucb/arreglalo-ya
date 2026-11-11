import { describe, expect, it } from 'vitest';
import {
  formatearBs,
  formatearDistancia,
  formatearFecha,
  valorDatetimeLocal,
} from './formato';

describe('formato', () => {
  it('formatea montos en bolivianos', () => {
    expect(formatearBs(1250.5)).toContain('1.250');
    expect(formatearBs(1250.5)).toContain('50');
    expect(formatearBs(null)).toBe('Bs 0,00');
  });

  it('formatea fechas y valores inválidos', () => {
    expect(formatearFecha('2026-11-10T10:00:00.000Z')).not.toBe(
      'Sin fecha',
    );
    expect(formatearFecha('no-es-fecha')).toBe('Sin fecha');
  });

  it('convierte fechas al formato de input datetime-local', () => {
    const valor = valorDatetimeLocal('2026-11-10T10:00:00.000Z');
    expect(valor).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(valorDatetimeLocal(null)).toBe('');
  });

  it('describe la distancia del trabajador', () => {
    expect(formatearDistancia(0)).toBe('En tu zona');
    expect(formatearDistancia(1)).toBe('Zona cercana');
    expect(formatearDistancia(2)).toBe('Zona vecina');
  });
});
