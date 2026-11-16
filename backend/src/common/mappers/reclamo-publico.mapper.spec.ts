import { describe, expect, it } from 'vitest';
import { EstadoReclamo } from '../enums/estado-reclamo.enum.js';
import type { Reclamo } from '../../entities/reclamo.entity.js';
import { toReclamoPublico } from './reclamo-publico.mapper.js';

const HORA = 3_600_000;

function crearReclamo(overrides: Partial<Reclamo> = {}): Reclamo {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    solicitudId: '44444444-4444-4444-8444-444444444444',
    motivo: 'El trabajo quedó incompleto',
    evidenciaFotos: [],
    respuestaTrabajador: null,
    estado: EstadoReclamo.ABIERTO,
    resolucionSupervisor: null,
    fechaApertura: new Date('2026-05-01T09:00:00.000Z'),
    ...overrides,
  } as Reclamo;
}

describe('toReclamoPublico - SLA de reclamos (RF30)', () => {
  const ahora = new Date('2026-05-04T10:00:00.000Z');

  it('marca fuera de plazo al superar las 48 horas sin respuesta', () => {
    const resultado = toReclamoPublico(
      crearReclamo({
        fechaApertura: new Date(ahora.getTime() - 49 * HORA),
      }),
      ahora,
    );

    expect(resultado.fuera_de_plazo).toBe(true);
    expect(resultado.vencido_sla).toBe(false);
  });

  it('marca vencido_sla al superar las 72 horas sin resolución', () => {
    const resultado = toReclamoPublico(
      crearReclamo({
        fechaApertura: new Date(ahora.getTime() - 73 * HORA),
      }),
      ahora,
    );

    expect(resultado.vencido_sla).toBe(true);
  });

  it('no marca SLA vencido cuando el reclamo ya fue resuelto', () => {
    const resultado = toReclamoPublico(
      crearReclamo({
        estado: EstadoReclamo.RECHAZADO,
        fechaApertura: new Date(ahora.getTime() - 200 * HORA),
      }),
      ahora,
    );

    expect(resultado.fuera_de_plazo).toBe(false);
    expect(resultado.vencido_sla).toBe(false);
    expect(resultado.horas_para_responder).toBeNull();
  });
});
