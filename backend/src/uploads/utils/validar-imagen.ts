import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';
import type { ArchivoImagen } from '../interfaces/archivo-imagen.interface.js';

export const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;

const EXTENSIONES_POR_MIME: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export function validarImagen(archivo: ArchivoImagen): void {
  const extension = extname(archivo.originalname).toLowerCase();
  const extensionesPermitidas =
    EXTENSIONES_POR_MIME[archivo.mimetype];
  if (
    !extensionesPermitidas ||
    !extensionesPermitidas.includes(extension)
  ) {
    throw new BadRequestException(
      'La imagen debe ser JPG, PNG o WebP',
    );
  }
  if (archivo.buffer.length > MAX_IMAGEN_BYTES) {
    throw new BadRequestException(
      'La imagen supera el tamaño máximo de 5 MB',
    );
  }
}
