import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { ArchivoImagen } from '../interfaces/archivo-imagen.interface.js';
import {
  MAX_IMAGEN_BYTES,
  validarImagen,
} from './validar-imagen.js';

function crearArchivo(
  overrides: Partial<ArchivoImagen> = {},
): ArchivoImagen {
  return Object.assign(
    {
      fieldname: 'archivo',
      originalname: 'foto.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.alloc(1024),
    },
    overrides,
  );
}

describe('validación de imágenes', () => {
  it('acepta JPG, PNG y WebP de hasta 5 MB', () => {
    expect(() => validarImagen(crearArchivo())).not.toThrow();
    expect(() =>
      validarImagen(
        crearArchivo({
          originalname: 'foto.png',
          mimetype: 'image/png',
        }),
      ),
    ).not.toThrow();
    expect(() =>
      validarImagen(
        crearArchivo({
          originalname: 'foto.webp',
          mimetype: 'image/webp',
        }),
      ),
    ).not.toThrow();
  });

  it('rechaza formatos no permitidos', () => {
    expect(() =>
      validarImagen(crearArchivo({ originalname: 'foto.gif' })),
    ).toThrow(BadRequestException);
    expect(() =>
      validarImagen(
        crearArchivo({
          originalname: 'foto.jpg',
          mimetype: 'application/pdf',
        }),
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza imágenes mayores a 5 MB', () => {
    expect(() =>
      validarImagen(
        crearArchivo({
          size: MAX_IMAGEN_BYTES + 1,
          buffer: Buffer.alloc(MAX_IMAGEN_BYTES + 1),
        }),
      ),
    ).toThrow(BadRequestException);
  });
});
