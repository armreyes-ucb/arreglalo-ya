import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Documento } from '../entities/documento.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Zona } from '../entities/zona.entity.js';
import { TrabajadoresController } from './trabajadores.controller.js';
import { TrabajadoresService } from './trabajadores.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PerfilTrabajador,
      Zona,
      TrabajadorZona,
      Documento,
    ]),
    AuthModule,
  ],
  controllers: [TrabajadoresController],
  providers: [TrabajadoresService],
  exports: [TrabajadoresService],
})
export class TrabajadoresModule {}
