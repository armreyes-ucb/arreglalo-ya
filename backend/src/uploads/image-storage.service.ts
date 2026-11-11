import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { ArchivoImagen } from './interfaces/archivo-imagen.interface.js';

const NOMBRE_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

const MIME_POR_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export interface ImagenDescargada {
  buffer: Buffer;
  mime: string;
  nombre: string;
}

@Injectable()
export class ImageStorageService {
  private readonly directorio =
    process.env.UPLOADS_DIR ??
    join(process.cwd(), 'storage', 'public', 'imagenes');

  async guardar(archivo: ArchivoImagen): Promise<string> {
    await mkdir(this.directorio, { recursive: true });
    const extension = extname(archivo.originalname).toLowerCase();
    const nombre = `${randomUUID()}${extension}`;
    await writeFile(join(this.directorio, nombre), archivo.buffer);
    return `/uploads/imagenes/${nombre}`;
  }

  async leer(nombre: string): Promise<ImagenDescargada> {
    if (!NOMBRE_VALIDO.test(nombre)) {
      throw new NotFoundException('Imagen no encontrada');
    }
    try {
      const buffer = await readFile(join(this.directorio, nombre));
      return {
        buffer,
        mime:
          MIME_POR_EXTENSION[extname(nombre).toLowerCase()] ??
          'application/octet-stream',
        nombre,
      };
    } catch {
      throw new NotFoundException('Imagen no encontrada');
    }
  }
}
