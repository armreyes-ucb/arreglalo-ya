import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
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
    ]),
    AuthModule,
  ],
  controllers: [PagosController],
  providers: [PagosService, BusinessRulesService],
  exports: [PagosService],
})
export class PagosModule {}
