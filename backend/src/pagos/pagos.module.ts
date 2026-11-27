import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { ReputacionModule } from '../reputacion/reputacion.module.js';
import { PagosController } from './pagos.controller.js';
import { PagosService } from './pagos.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pago,
      Solicitud,
      Oferta,
      HistorialEstado,
      Devolucion,
      Reclamo,
      ClienteConflictivo,
      PerfilTrabajador,
    ]),
    AuthModule,
    ReputacionModule,
  ],
  controllers: [PagosController],
  providers: [PagosService, BusinessRulesService],
  exports: [PagosService],
})
export class PagosModule {}
