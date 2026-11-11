import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity.js';
import { Documento } from '../entities/documento.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { DocumentStorageService } from './document-storage.service.js';
import { VerificacionController } from './verificacion.controller.js';
import { VerificacionService } from './verificacion.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PerfilTrabajador,
      Documento,
      CuentaBancaria,
    ]),
    AuthModule,
  ],
  controllers: [VerificacionController],
  providers: [VerificacionService, DocumentStorageService],
})
export class VerificacionModule {}
