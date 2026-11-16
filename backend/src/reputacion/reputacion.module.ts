import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { SancionesService } from '../common/services/sanciones.service.js';
import { Calificacion } from '../entities/calificacion.entity.js';
import { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { Suspension } from '../entities/suspension.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import { CalificacionesController } from './calificaciones.controller.js';
import { CalificacionesService } from './calificaciones.service.js';
import { ConflictivosService } from './conflictivos.service.js';
import { ReclamosController } from './reclamos.controller.js';
import { ReclamosService } from './reclamos.service.js';
import { SolicitudesReputacionController } from './solicitudes-reputacion.controller.js';
import { SupervisionConflictivosController } from './supervision-conflictivos.controller.js';
import { SupervisionSuspensionesController } from './supervision-suspensiones.controller.js';
import { SuspensionesController } from './suspensiones.controller.js';
import { SuspensionesService } from './suspensiones.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Calificacion,
      Reclamo,
      Suspension,
      ClienteConflictivo,
      Solicitud,
      PerfilTrabajador,
      Usuario,
    ]),
    AuthModule,
  ],
  controllers: [
    CalificacionesController,
    ReclamosController,
    SolicitudesReputacionController,
    SuspensionesController,
    SupervisionSuspensionesController,
    SupervisionConflictivosController,
  ],
  providers: [
    CalificacionesService,
    ReclamosService,
    SuspensionesService,
    ConflictivosService,
    BusinessRulesService,
    SancionesService,
  ],
})
export class ReputacionModule {}
