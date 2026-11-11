import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';
import type { ArchivoSubido } from '../interfaces/archivo-subido.interface.js';

export const MAX_DOCUMENTO_BYTES = 5 * 1024 * 1024;

const EXTENSIONES_POR_MIME: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
};

export function validarArchivoDocumento(
  tipo: string,
  archivo: ArchivoSubido,
): void {
  const extension = extname(archivo.originalname).toLowerCase();
  const extensionesPermitidas =
    EXTENSIONES_POR_MIME[archivo.mimetype];
  if (
    !extensionesPermitidas ||
    !extensionesPermitidas.includes(extension)
  ) {
    throw new BadRequestException(
      `El documento ${tipo} debe ser JPG, PNG o PDF`,
    );
  }
  if (archivo.buffer.length > MAX_DOCUMENTO_BYTES) {
    throw new BadRequestException(
      `El documento ${tipo} supera el tamaño máximo de 5 MB`,
    );
  }
}
