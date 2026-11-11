import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { ArchivoSubido } from '../interfaces/archivo-subido.interface.js';
import {
  MAX_DOCUMENTO_BYTES,
  validarArchivoDocumento,
} from './validar-archivo.js';

function crearArchivo(
  overrides: Partial<ArchivoSubido> = {},
): ArchivoSubido {
  return Object.assign(
    {
      fieldname: 'CARNET_ANVERSO',
      originalname: 'carnet.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.alloc(1024),
    },
    overrides,
  );
}

describe('CP23 - validación de documentos', () => {
  it('acepta JPG, PNG y PDF de hasta 5 MB', () => {
    expect(() =>
      validarArchivoDocumento('CARNET_ANVERSO', crearArchivo()),
    ).not.toThrow();
    expect(() =>
      validarArchivoDocumento(
        'SELFIE',
        crearArchivo({
          originalname: 'selfie.png',
          mimetype: 'image/png',
        }),
      ),
    ).not.toThrow();
    expect(() =>
      validarArchivoDocumento(
        'REJAP',
        crearArchivo({
          originalname: 'rejap.pdf',
          mimetype: 'application/pdf',
        }),
      ),
    ).not.toThrow();
    expect(() =>
      validarArchivoDocumento(
        'CERTIFICADO',
        crearArchivo({
          originalname: 'certificado.pdf',
          mimetype: 'application/pdf',
          size: MAX_DOCUMENTO_BYTES,
          buffer: Buffer.alloc(MAX_DOCUMENTO_BYTES),
        }),
      ),
    ).not.toThrow();
  });

  it('rechaza extensiones y MIME no permitidos', () => {
    expect(() =>
      validarArchivoDocumento(
        'CARNET_ANVERSO',
        crearArchivo({ originalname: 'carnet.exe' }),
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      validarArchivoDocumento(
        'CARNET_ANVERSO',
        crearArchivo({
          originalname: 'carnet.jpg',
          mimetype: 'application/pdf',
        }),
      ),
    ).toThrow(BadRequestException);
  });

  it('rechaza archivos mayores a 5 MB', () => {
    expect(() =>
      validarArchivoDocumento(
        'REJAP',
        crearArchivo({
          originalname: 'rejap.pdf',
          mimetype: 'application/pdf',
          size: MAX_DOCUMENTO_BYTES + 1,
          buffer: Buffer.alloc(MAX_DOCUMENTO_BYTES + 1),
        }),
      ),
    ).toThrow(BadRequestException);
  });
});
