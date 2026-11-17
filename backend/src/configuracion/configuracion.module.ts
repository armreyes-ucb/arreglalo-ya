import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ConfiguracionController } from './configuracion.controller.js';
import { ConfiguracionService } from './configuracion.service.js';

/**
 * Global para que solicitudes, pagos, trabajadores, reputación y los
 * cron jobs lean la configuración vigente sin repetir imports.
 */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [ConfiguracionController],
  providers: [ConfiguracionService],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
