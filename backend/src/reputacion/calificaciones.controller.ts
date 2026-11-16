import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { CalificacionesService } from './calificaciones.service.js';
import { CrearCalificacionDto } from './dto/crear-calificacion.dto.js';
import { ResponderCalificacionDto } from './dto/responder-calificacion.dto.js';
import type { CalificacionPublica } from './interfaces/calificacion-publica.interface.js';
import type { ResumenReputacion } from './interfaces/resumen-reputacion.interface.js';

@Controller('calificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalificacionesController {
  constructor(
    private readonly calificacionesService: CalificacionesService,
  ) {}

  @Post()
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  crear(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: CrearCalificacionDto,
  ): Promise<CalificacionPublica> {
    return this.calificacionesService.crear(
      usuario.id,
      usuario.rolActivo,
      dto,
    );
  }

  @Patch(':id/responder')
  @Roles(Rol.TRABAJADOR)
  responder(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) calificacionId: string,
    @Body() dto: ResponderCalificacionDto,
  ): Promise<CalificacionPublica> {
    return this.calificacionesService.responder(
      usuario.id,
      calificacionId,
      dto,
    );
  }

  @Get('trabajador/:trabajadorId')
  @Roles(
    Rol.CLIENTE,
    Rol.TRABAJADOR,
    Rol.SUPERVISOR,
    Rol.SUPERADMIN,
  )
  listarPorTrabajador(
    @Param('trabajadorId', new ParseUUIDPipe())
    trabajadorId: string,
  ): Promise<ResumenReputacion> {
    return this.calificacionesService.listarPorTrabajador(
      trabajadorId,
    );
  }

  @Get('mias')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  listarEscritas(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<CalificacionPublica[]> {
    return this.calificacionesService.listarEscritas(usuario.id);
  }

  @Get('recibidas')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  listarRecibidas(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<CalificacionPublica[]> {
    return this.calificacionesService.listarRecibidas(usuario.id);
  }
}
