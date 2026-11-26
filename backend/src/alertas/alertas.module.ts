import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AlertaSolicitud } from '../entities/alerta-solicitud.entity.js';
import { ConfiguracionAlerta } from '../entities/configuracion-alerta.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { Zona } from '../entities/zona.entity.js';
import { AlertasAdminController } from './alertas-admin.controller.js';
import { AlertasController } from './alertas.controller.js';
import { AlertasService } from './alertas.service.js';

/** RF: alertas configurables de solicitudes sin ofertas y ampliación de plazo. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConfiguracionAlerta,
      AlertaSolicitud,
      Solicitud,
      Oferta,
      Zona,
    ]),
    AuthModule,
  ],
  controllers: [AlertasAdminController, AlertasController],
  providers: [AlertasService],
  exports: [AlertasService],
})
export class AlertasModule {}
