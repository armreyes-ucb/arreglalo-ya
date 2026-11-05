import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RegistroDto } from './registro.dto.js';

async function validar(payload: unknown) {
  const dto = plainToInstance(RegistroDto, payload);
  return validate(dto);
}

describe('RegistroDto', () => {
  const base = {
    nombre_completo: 'Usuario Prueba',
    telefono: '+59170000001',
    password: 'Password123',
    acepto_terminos: true,
    codigo: '123456',
  };

  it('acepta un registro válido', async () => {
    expect(await validar(base)).toHaveLength(0);
  });

  it('rechaza no aceptar los términos', async () => {
    const errors = await validar({
      ...base,
      acepto_terminos: false,
    });
    expect(
      errors.some((error) => error.property === 'acepto_terminos'),
    ).toBe(true);
  });

  it('rechaza un código que no tiene 6 dígitos', async () => {
    const errors = await validar({ ...base, codigo: '123' });
    expect(
      errors.some((error) => error.property === 'codigo'),
    ).toBe(true);
  });

  it('normaliza el teléfono con espacios y guiones', () => {
    const dto = plainToInstance(RegistroDto, {
      ...base,
      telefono: '+591 700-00001',
    });
    expect(dto.telefono).toBe('+59170000001');
  });
});
