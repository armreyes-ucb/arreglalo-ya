import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ActualizarPerfilTrabajadorDto } from './actualizar-perfil-trabajador.dto.js';

async function validar(payload: unknown) {
  const dto = plainToInstance(
    ActualizarPerfilTrabajadorDto,
    payload,
  );
  return validate(dto);
}

describe('ActualizarPerfilTrabajadorDto', () => {
  const base = {
    especialidades: ['PLOMERIA'],
    horarios: 'Lunes a sábado',
    precios_estimados: { PLOMERIA: 80 },
    zonas_ids: [1],
    fotos_urls: ['https://fotos/1.jpg'],
  };

  it('acepta un perfil válido', async () => {
    expect(await validar(base)).toHaveLength(0);
  });

  it('permite vaciar fotos y precios', async () => {
    expect(
      await validar({
        ...base,
        fotos_urls: [],
        precios_estimados: {},
      }),
    ).toHaveLength(0);
  });

  it('rechaza más de seis fotos', async () => {
    const errors = await validar({
      ...base,
      fotos_urls: ['1', '2', '3', '4', '5', '6', '7'],
    });

    expect(
      errors.some((error) => error.property === 'fotos_urls'),
    ).toBe(true);
  });
});
