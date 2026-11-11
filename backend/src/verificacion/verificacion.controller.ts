import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CargarDocumentosDto } from './dto/cargar-documentos.dto.js';
import { RevisarVerificacionDto } from './dto/revisar-verificacion.dto.js';
import type { ArchivoSubido } from './interfaces/archivo-subido.interface.js';
import type { EstadoVerificacionTrabajador } from './interfaces/estado-verificacion.interface.js';
import type { ExpedienteVerificacion } from './interfaces/expediente-verificacion.interface.js';
import type { RespuestaCargaDocumentos } from './interfaces/respuesta-carga-documentos.interface.js';
import type { ResultadoRevisionVerificacion } from './interfaces/resultado-revision-verificacion.interface.js';
import { MAX_DOCUMENTO_BYTES } from './utils/validar-archivo.js';
import { VerificacionService } from './verificacion.service.js';

@Controller('verificacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VerificacionController {
  constructor(
    private readonly verificacionService: VerificacionService,
  ) {}

  @Post('documentos')
  @Roles(Rol.TRABAJADOR)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'CARNET_ANVERSO', maxCount: 1 },
        { name: 'CARNET_REVERSO', maxCount: 1 },
        { name: 'SELFIE', maxCount: 1 },
        { name: 'REJAP', maxCount: 1 },
        { name: 'CERTIFICADO', maxCount: 1 },
      ],
      { limits: { fileSize: MAX_DOCUMENTO_BYTES, files: 5 } },
    ),
  )
  cargarDocumentos(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: CargarDocumentosDto,
    @UploadedFiles() archivos: Record<string, ArchivoSubido[]>,
  ): Promise<RespuestaCargaDocumentos> {
    return this.verificacionService.cargarDocumentos(
      usuario.id,
      dto,
      archivos,
    );
  }

  @Get('bandeja')
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  obtenerBandeja(): Promise<ExpedienteVerificacion[]> {
    return this.verificacionService.obtenerBandeja();
  }

  @Get('estado')
  @Roles(Rol.TRABAJADOR)
  obtenerEstado(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<EstadoVerificacionTrabajador> {
    return this.verificacionService.obtenerEstado(usuario.id);
  }

  @Get(':trabajadorId/documentos/:documentoId/archivo')
  @Roles(Rol.TRABAJADOR, Rol.SUPERVISOR, Rol.SUPERADMIN)
  async descargarDocumento(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('trabajadorId', new ParseUUIDPipe()) trabajadorId: string,
    @Param('documentoId', new ParseUUIDPipe()) documentoId: string,
    @Res({ passthrough: true }) respuesta: Response,
  ): Promise<StreamableFile> {
    const archivo = await this.verificacionService.obtenerArchivoDocumento(
      usuario,
      trabajadorId,
      documentoId,
    );
    respuesta.set({
      'Content-Type': archivo.mime,
      'Content-Disposition': `inline; filename="${archivo.nombre}"`,
      'Content-Length': archivo.buffer.length.toString(),
    });
    return new StreamableFile(archivo.buffer);
  }

  @Patch(':trabajadorId/revisar')
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  revisar(
    @Param('trabajadorId', new ParseUUIDPipe()) trabajadorId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: RevisarVerificacionDto,
  ): Promise<ResultadoRevisionVerificacion> {
    return this.verificacionService.revisar(
      trabajadorId,
      usuario.id,
      dto,
    );
  }
}
