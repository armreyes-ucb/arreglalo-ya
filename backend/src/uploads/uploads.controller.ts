import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { ArchivoImagen } from './interfaces/archivo-imagen.interface.js';
import { ImageStorageService } from './image-storage.service.js';
import {
  MAX_IMAGEN_BYTES,
  validarImagen,
} from './utils/validar-imagen.js';

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly imageStorage: ImageStorageService,
  ) {}

  @Post('imagen')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: MAX_IMAGEN_BYTES, files: 1 },
    }),
  )
  async subirImagen(
    @UploadedFile() archivo: ArchivoImagen | undefined,
  ): Promise<{ url: string }> {
    if (!archivo) {
      throw new BadRequestException('Debe enviar una imagen');
    }
    validarImagen(archivo);
    const url = await this.imageStorage.guardar(archivo);
    return { url };
  }

  @Get('imagenes/:nombre')
  async obtenerImagen(
    @Param('nombre') nombre: string,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<StreamableFile> {
    const imagen = await this.imageStorage.leer(nombre);
    respuesta.set({
      'Content-Type': imagen.mime,
      'Content-Disposition': `inline; filename="${imagen.nombre}"`,
      'Content-Length': imagen.buffer.length.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return new StreamableFile(imagen.buffer);
  }
}
