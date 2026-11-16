import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { Documento } from '../entities/documento.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import { Zona } from '../entities/zona.entity.js';
import { DocumentStorageService } from '../verificacion/document-storage.service.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Zona,
      PerfilTrabajador,
      TrabajadorZona,
      Documento,
      CuentaBancaria,
      Solicitud,
      Pago,
      Devolucion,
      Reclamo,
    ]),
    AuthModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService, DocumentStorageService],
})
export class UsuariosModule {}
