import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { AlertasService } from './alertas.service.js';
import { AmpliarPlazoDto } from './dto/ampliar-plazo.dto.js';
import type { ListadoAlertasSinOfertas } from './interfaces/alerta-sin-ofertas.interface.js';
import type { ResultadoAmpliacionPlazo } from './interfaces/resultado-ampliacion.interface.js';

/** Supervisión de solicitudes abiertas que no recibieron propuestas. */
@Controller('supervision/alertas-sin-ofertas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get()
  listar(): Promise<ListadoAlertasSinOfertas> {
    return this.alertasService.listar();
  }

  @Post(':solicitudId/ampliar-plazo')
  ampliar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('solicitudId', new ParseUUIDPipe()) solicitudId: string,
    @Body() dto: AmpliarPlazoDto,
  ): Promise<ResultadoAmpliacionPlazo> {
    return this.alertasService.ampliarPlazo(usuario, solicitudId, dto);
  }
}
