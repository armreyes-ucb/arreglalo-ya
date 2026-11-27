import { describe, expect, it } from 'vitest';
import { EstadoClienteConflictivo } from '../../common/enums/estado-cliente-conflictivo.enum.js';
import {
  construirClientesAdvertidos,
  debeAdvertirCliente,
} from './advertencia-conflictivo.js';

describe('debeAdvertirCliente', () => {
  it('advierte siempre a un cliente confirmado', () => {
    expect(
      debeAdvertirCliente(
        {
          estado: EstadoClienteConflictivo.CONFIRMADO,
          reportesComprobados: 0,
        },
        3,
      ),
    ).toBe(true);
  });

  it('no advierte a un caso desestimado aunque tenga reportes', () => {
    expect(
      debeAdvertirCliente(
        {
          estado: EstadoClienteConflictivo.DESESTIMADO,
          reportesComprobados: 5,
        },
        3,
      ),
    ).toBe(false);
  });

  it('advierte por reportes comprobados en un caso potencial', () => {
    expect(
      debeAdvertirCliente(
        {
          estado: EstadoClienteConflictivo.POTENCIAL,
          reportesComprobados: 3,
        },
        3,
      ),
    ).toBe(true);
  });

  it('no advierte a un caso potencial detectado solo por reclamos', () => {
    expect(
      debeAdvertirCliente(
        {
          estado: EstadoClienteConflictivo.POTENCIAL,
          reportesComprobados: 0,
        },
        3,
      ),
    ).toBe(false);
  });

  it('respeta el umbral configurable', () => {
    expect(
      debeAdvertirCliente(
        {
          estado: EstadoClienteConflictivo.POTENCIAL,
          reportesComprobados: 3,
        },
        5,
      ),
    ).toBe(false);
  });

  it('construye el conjunto de clientes advertidos', () => {
    const advertidos = construirClientesAdvertidos(
      [
        {
          clienteId: 'a',
          estado: EstadoClienteConflictivo.CONFIRMADO,
          reportesComprobados: 0,
        },
        {
          clienteId: 'b',
          estado: EstadoClienteConflictivo.POTENCIAL,
          reportesComprobados: 0,
        },
      ],
      3,
    );

    expect(advertidos.has('a')).toBe(true);
    expect(advertidos.has('b')).toBe(false);
  });
});
