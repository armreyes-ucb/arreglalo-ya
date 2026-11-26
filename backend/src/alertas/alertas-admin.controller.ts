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
import { AlertasService } from './alertas.service.js';
import { ActualizarConfiguracionAlertaDto } from './dto/actualizar-configuracion-alerta.dto.js';
import type { ConfiguracionAlertaSinOfertas } from './interfaces/configuracion-alerta-sin-ofertas.interface.js';

/** El periodo de alerta lo administra únicamente el SUPERADMIN. */
@Controller('admin/alertas-sin-ofertas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN)
export class AlertasAdminController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get()
  obtener(): Promise<ConfiguracionAlertaSinOfertas> {
    return this.alertasService.obtenerConfiguracion();
  }

  @Put()
  actualizar(
    @Body() dto: ActualizarConfiguracionAlertaDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ConfiguracionAlertaSinOfertas> {
    return this.alertasService.actualizarConfiguracion(dto, usuario.id);
  }
}
