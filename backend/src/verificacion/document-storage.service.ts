import { BadRequestException, Injectable } from '@nestjs/common';
import {
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, extname, join } from 'node:path';
import type { ArchivoSubido } from './interfaces/archivo-subido.interface.js';

const PREFIJO_PRIVADO = 'private://documentos/';

const MIME_POR_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

export interface ArchivoDescargado {
  buffer: Buffer;
  mime: string;
  nombre: string;
}

@Injectable()
export class DocumentStorageService {
  private readonly directorio =
    process.env.DOCUMENTOS_DIR ??
    join(process.cwd(), 'storage', 'private', 'documentos');

  async guardar(archivo: ArchivoSubido): Promise<string> {
    await mkdir(this.directorio, { recursive: true });
    const extension = extname(archivo.originalname).toLowerCase();
    const nombre = `${randomUUID()}${extension}`;
    await writeFile(join(this.directorio, nombre), archivo.buffer);
    return `${PREFIJO_PRIVADO}${nombre}`;
  }

  async leer(url: string): Promise<ArchivoDescargado> {
    if (!url.startsWith(PREFIJO_PRIVADO)) {
      throw new BadRequestException('Documento inválido');
    }
    const referencia = url.slice(PREFIJO_PRIVADO.length);
    const nombre = basename(referencia);
    if (!nombre || nombre !== referencia) {
      throw new BadRequestException('Documento inválido');
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
      throw new BadRequestException('No se pudo leer el documento');
    }
  }
}
