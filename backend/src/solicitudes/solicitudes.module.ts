import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Precio } from '../entities/precio.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Zona } from '../entities/zona.entity.js';
import { PagosModule } from '../pagos/pagos.module.js';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module.js';
import { SolicitudesController } from './solicitudes.controller.js';
import { SolicitudesService } from './solicitudes.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Solicitud,
      Oferta,
      Pago,
      Precio,
      HistorialEstado,
      ClienteConflictivo,
      PerfilTrabajador,
      TrabajadorZona,
      Zona,
    ]),
    AuthModule,
    PagosModule,
    TrabajadoresModule,
  ],
  controllers: [SolicitudesController],
  providers: [SolicitudesService, BusinessRulesService],
})
export class SolicitudesModule {}
