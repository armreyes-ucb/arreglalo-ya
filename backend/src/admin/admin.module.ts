import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import { Zona } from '../entities/zona.entity.js';
import { ReportesController } from './reportes.controller.js';
import { ReportesService } from './reportes.service.js';
import { SupervisoresController } from './supervisores.controller.js';
import { SupervisoresService } from './supervisores.service.js';
import { ZonasAdminController } from './zonas-admin.controller.js';
import { ZonasAdminService } from './zonas-admin.service.js';

/** M8 Administración: RF07 (supervisores) + RF34 (zonas y reportes). */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Zona,
      Solicitud,
      Pago,
      Devolucion,
      Reclamo,
      TrabajadorZona,
      PerfilTrabajador,
    ]),
    AuthModule,
  ],
  controllers: [
    SupervisoresController,
    ZonasAdminController,
    ReportesController,
  ],
  providers: [
    SupervisoresService,
    ZonasAdminService,
    ReportesService,
  ],
})
export class AdminModule {}
