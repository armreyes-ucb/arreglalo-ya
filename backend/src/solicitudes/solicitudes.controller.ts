import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CrearOfertaDto } from './dto/crear-oferta.dto.js';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto.js';
import { ListarDisponiblesQueryDto } from './dto/listar-disponibles-query.dto.js';
import type { OfertaConSolicitud } from './interfaces/oferta-con-solicitud.interface.js';
import type { OfertaPublica } from './interfaces/oferta-publica.interface.js';
import type { SolicitudDetalle } from './interfaces/solicitud-detalle.interface.js';
import type { SolicitudDisponible } from './interfaces/solicitud-disponible.interface.js';
import type { SolicitudPublica } from './interfaces/solicitud-publica.interface.js';
import { SolicitudesService } from './solicitudes.service.js';

@Controller('solicitudes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudesController {
  constructor(
    private readonly solicitudesService: SolicitudesService,
  ) {}

  @Post()
  @Roles(Rol.CLIENTE)
  crear(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: CrearSolicitudDto,
  ): Promise<SolicitudPublica> {
    return this.solicitudesService.crearSolicitud(usuario.id, dto);
  }

  @Get('disponibles')
  @Roles(Rol.TRABAJADOR)
  listarDisponibles(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() query: ListarDisponiblesQueryDto,
  ): Promise<SolicitudDisponible[]> {
    return this.solicitudesService.listarDisponibles(
      usuario.id,
      query,
    );
  }

  @Get('mias')
  @Roles(Rol.CLIENTE)
  listarMias(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<SolicitudPublica[]> {
    return this.solicitudesService.listarMias(usuario.id);
  }

  @Get('mis-ofertas')
  @Roles(Rol.TRABAJADOR)
  listarMisOfertas(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<OfertaConSolicitud[]> {
    return this.solicitudesService.listarMisOfertas(usuario.id);
  }

  @Get(':id')
  @Roles(Rol.CLIENTE)
  obtenerDetalle(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
  ): Promise<SolicitudDetalle> {
    return this.solicitudesService.obtenerDetalle(
      usuario.id,
      solicitudId,
    );
  }

  @Post(':id/ofertas')
  @Roles(Rol.TRABAJADOR)
  crearOferta(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
    @Body() dto: CrearOfertaDto,
  ): Promise<OfertaPublica> {
    return this.solicitudesService.crearOferta(
      usuario.id,
      solicitudId,
      dto,
    );
  }
}
