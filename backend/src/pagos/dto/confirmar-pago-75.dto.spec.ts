import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ConfirmarPago75Dto } from './confirmar-pago-75.dto.js';

async function validar(payload: unknown) {
  const dto = plainToInstance(ConfirmarPago75Dto, payload);
  return validate(dto);
}

describe('ConfirmarPago75Dto', () => {
  it('acepta una confirmación sin motivo', async () => {
    expect(await validar({ confirmado: true })).toHaveLength(0);
  });

  it('acepta un reporte con motivo', async () => {
    expect(
      await validar({
        confirmado: false,
        motivo: 'El cliente no pagó el saldo',
      }),
    ).toHaveLength(0);
  });

  it('rechaza un motivo demasiado corto', async () => {
    const errores = await validar({
      confirmado: false,
      motivo: 'no',
    });

    expect(
      errores.some((error) => error.property === 'motivo'),
    ).toBe(true);
  });

  it('exige la bandera confirmado', async () => {
    const errores = await validar({ motivo: 'Sin saldo' });

    expect(
      errores.some((error) => error.property === 'confirmado'),
    ).toBe(true);
  });
});
