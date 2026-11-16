import {
  Body,
  Controller,
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
import { CalificacionesService } from './calificaciones.service.js';
import { ComentarSolicitudDto } from './dto/comentar-solicitud.dto.js';
import { CrearCalificacionDto } from './dto/crear-calificacion.dto.js';
import { CrearReclamoDto } from './dto/crear-reclamo.dto.js';
import type { CalificacionPublica } from './interfaces/calificacion-publica.interface.js';
import type { ReclamoPublico } from './interfaces/reclamo-publico.interface.js';
import { ReclamosService } from './reclamos.service.js';

/**
 * RF28, RF29 y RF30: las acciones de reputación cuelgan de la solicitud
 * sobre la que se califica, se comenta o se reclama.
 */
@Controller('solicitudes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudesReputacionController {
  constructor(
    private readonly calificacionesService: CalificacionesService,
    private readonly reclamosService: ReclamosService,
  ) {}

  @Post(':id/calificar')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  calificar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
    @Body() dto: CrearCalificacionDto,
  ): Promise<CalificacionPublica> {
    return this.calificacionesService.crear(
      usuario.id,
      usuario.rolActivo,
      solicitudId,
      dto,
    );
  }

  @Post(':id/comentarios')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  comentar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
    @Body() dto: ComentarSolicitudDto,
  ): Promise<CalificacionPublica> {
    return this.calificacionesService.comentar(
      usuario.id,
      usuario.rolActivo,
      solicitudId,
      dto,
    );
  }

  @Post(':id/reclamos')
  @Roles(Rol.CLIENTE)
  reclamar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
    @Body() dto: CrearReclamoDto,
  ): Promise<ReclamoPublico> {
    return this.reclamosService.crear(usuario.id, solicitudId, dto);
  }
}
