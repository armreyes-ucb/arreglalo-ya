import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CrearSolicitudDto } from './crear-solicitud.dto.js';

async function validar(payload: unknown) {
  const dto = plainToInstance(CrearSolicitudDto, payload);
  return validate(dto);
}

describe('CrearSolicitudDto', () => {
  const base = {
    zona_id: 1,
    especialidad: 'PLOMERIA',
    tipo_problema: 'Fuga de agua',
    descripcion:
      'Fuga debajo del lavamanos de la cocina desde ayer.',
    fotos_urls: ['https://fotos/1.jpg'],
    direccion_oculta: 'Calle Secreta 123',
    fecha_cita_preferida: '2030-01-01T10:00:00.000Z',
    urgente: true,
  };

  it('acepta una solicitud válida', async () => {
    expect(await validar(base)).toHaveLength(0);
  });

  it('rechaza más de tres fotos', async () => {
    const errors = await validar({
      ...base,
      fotos_urls: ['1', '2', '3', '4'],
    });

    expect(
      errors.some((error) => error.property === 'fotos_urls'),
    ).toBe(true);
  });
});
