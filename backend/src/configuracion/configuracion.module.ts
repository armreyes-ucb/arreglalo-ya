import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { ConfiguracionClientesConflictivos } from '../entities/configuracion-clientes-conflictivos.entity.js';
import { ConfiguracionConflictivosController } from './configuracion-conflictivos.controller.js';
import { ConfiguracionConflictivosService } from './configuracion-conflictivos.service.js';
import { ConfiguracionController } from './configuracion.controller.js';
import { ConfiguracionService } from './configuracion.service.js';

/**
 * Global para que solicitudes, pagos, trabajadores, reputación y los
 * cron jobs lean la configuración vigente sin repetir imports.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ConfiguracionClientesConflictivos]),
    AuthModule,
  ],
  controllers: [
    ConfiguracionController,
    ConfiguracionConflictivosController,
  ],
  providers: [ConfiguracionService, ConfiguracionConflictivosService],
  exports: [ConfiguracionService, ConfiguracionConflictivosService],
})
export class ConfiguracionModule {}
