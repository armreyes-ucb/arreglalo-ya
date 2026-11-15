import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CancelarSolicitudDto } from './cancelar-solicitud.dto.js';

async function validar(payload: unknown) {
  const dto = plainToInstance(CancelarSolicitudDto, payload);
  return validate(dto);
}

describe('CancelarSolicitudDto', () => {
  it('acepta un motivo de entre 3 y 500 caracteres', async () => {
    expect(
      await validar({ motivo: 'Cambio de planes' }),
    ).toHaveLength(0);
  });

  it('rechaza un motivo demasiado corto', async () => {
    const errores = await validar({ motivo: 'ok' });

    expect(
      errores.some((error) => error.property === 'motivo'),
    ).toBe(true);
  });

  it('rechaza un motivo demasiado largo', async () => {
    const errores = await validar({ motivo: 'a'.repeat(501) });

    expect(
      errores.some((error) => error.property === 'motivo'),
    ).toBe(true);
  });

  it('exige el motivo', async () => {
    const errores = await validar({});

    expect(
      errores.some((error) => error.property === 'motivo'),
    ).toBe(true);
  });
});
