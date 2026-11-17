import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { ConfiguracionService } from './configuracion.service.js';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto.js';
import type { CambioConfiguracion } from './interfaces/cambio-configuracion.interface.js';
import type { ConfiguracionPlataforma } from './interfaces/configuracion-plataforma.interface.js';

/** RF34 / CP35: solo el SUPERADMIN administra la configuración. */
@Controller('admin/configuracion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN)
export class ConfiguracionController {
  constructor(
    private readonly configuracionService: ConfiguracionService,
  ) {}

  @Get()
  obtener(): ConfiguracionPlataforma {
    return this.configuracionService.get();
  }

  @Get('historial')
  historial(): Promise<CambioConfiguracion[]> {
    return this.configuracionService.obtenerHistorial();
  }

  @Put()
  actualizar(
    @Body() dto: ActualizarConfiguracionDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ConfiguracionPlataforma> {
    return this.configuracionService.actualizar(dto, usuario.id);
  }
}
