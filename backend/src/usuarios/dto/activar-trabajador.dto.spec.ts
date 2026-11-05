import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';
import { ActivarTrabajadorDto } from './activar-trabajador.dto.js';

async function validar(payload: unknown) {
  const dto = plainToInstance(ActivarTrabajadorDto, payload);
  return validate(dto);
}

describe('ActivarTrabajadorDto', () => {
  it('rechaza no aceptar el contrato digital', async () => {
    const errors = await validar({
      acepto_contrato_digital: false,
      especialidades: [EspecialidadTipo.PLOMERIA],
      zonas: [1],
    });
    expect(
      errors.some(
        (error) => error.property === 'acepto_contrato_digital',
      ),
    ).toBe(true);
  });

  it('exige al menos una especialidad y una zona', async () => {
    const errors = await validar({
      acepto_contrato_digital: true,
      especialidades: [],
      zonas: [],
    });
    expect(
      errors.some((error) => error.property === 'especialidades'),
    ).toBe(true);
    expect(
      errors.some((error) => error.property === 'zonas'),
    ).toBe(true);
  });

  it('acepta un payload válido', async () => {
    const errors = await validar({
      acepto_contrato_digital: true,
      especialidades: [
        EspecialidadTipo.PLOMERIA,
        EspecialidadTipo.ELECTRICIDAD,
      ],
      zonas: [1, 2],
    });
    expect(errors).toHaveLength(0);
  });

  it('rechaza especialidades no válidas', async () => {
    const errors = await validar({
      acepto_contrato_digital: true,
      especialidades: ['OTRA'],
      zonas: [1],
    });
    expect(
      errors.some((error) => error.property === 'especialidades'),
    ).toBe(true);
  });
});
