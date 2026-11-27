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
import { ConfiguracionConflictivosService } from './configuracion-conflictivos.service.js';
import { ActualizarConfiguracionConflictivosDto } from './dto/actualizar-configuracion-conflictivos.dto.js';
import type { ConfiguracionConflictivos } from './interfaces/configuracion-conflictivos.interface.js';

/** RF32 / RF34: solo el SUPERADMIN administra los criterios de detección. */
@Controller('admin/configuracion/clientes-conflictivos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN)
export class ConfiguracionConflictivosController {
  constructor(
    private readonly configuracionService: ConfiguracionConflictivosService,
  ) {}

  @Get()
  obtener(): ConfiguracionConflictivos {
    return this.configuracionService.get();
  }

  @Put()
  actualizar(
    @Body() dto: ActualizarConfiguracionConflictivosDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ConfiguracionConflictivos> {
    return this.configuracionService.actualizar(dto, usuario.id);
  }
}
