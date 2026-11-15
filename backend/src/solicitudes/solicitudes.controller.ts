import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CancelarSolicitudDto } from './dto/cancelar-solicitud.dto.js';
import { CrearIncrementoDto } from './dto/crear-incremento.dto.js';
import { CrearOfertaDto } from './dto/crear-oferta.dto.js';
import { CrearPrecioFinalDto } from './dto/crear-precio-final.dto.js';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto.js';
import { ElegirOfertaDto } from './dto/elegir-oferta.dto.js';
import { ListarDisponiblesQueryDto } from './dto/listar-disponibles-query.dto.js';
import { ResponderPrecioDto } from './dto/responder-precio.dto.js';
import type { PagoPublico } from '../pagos/interfaces/pago-publico.interface.js';
import type { OfertaConSolicitud } from './interfaces/oferta-con-solicitud.interface.js';
import type { OfertaConTrabajador } from './interfaces/oferta-con-trabajador.interface.js';
import type { OfertaPublica } from './interfaces/oferta-publica.interface.js';
import type { PagoSolicitudPublico } from './interfaces/pago-solicitud.interface.js';
import type {
  PrecioPublico,
  ResolucionPrecio,
} from './interfaces/precio-publico.interface.js';
import type { ResolucionCancelacion } from './interfaces/resolucion-cancelacion.interface.js';
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
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  obtenerDetalle(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
  ): Promise<SolicitudDetalle> {
    return this.solicitudesService.obtenerDetalle(
      usuario.id,
      solicitudId,
      usuario.rolActivo,
    );
  }

  @Get(':id/ofertas')
  @Roles(Rol.CLIENTE)
  listarOfertas(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
  ): Promise<OfertaConTrabajador[]> {
    return this.solicitudesService.listarOfertasSolicitud(
      usuario.id,
      solicitudId,
    );
  }

  @Get(':id/pago')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  obtenerPago(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
  ): Promise<PagoSolicitudPublico> {
    return this.solicitudesService.obtenerPagoSolicitud(
      usuario.id,
      solicitudId,
      usuario.rolActivo,
    );
  }

  @Get(':id/precios')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  listarPrecios(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
  ): Promise<PrecioPublico[]> {
    return this.solicitudesService.listarPreciosSolicitud(
      usuario.id,
      solicitudId,
      usuario.rolActivo,
    );
  }

  @Patch(':id/terminar')
  @Roles(Rol.TRABAJADOR)
  terminar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
  ): Promise<SolicitudPublica> {
    return this.solicitudesService.terminarTrabajo(
      usuario.id,
      solicitudId,
    );
  }

  @Post(':id/cancelar')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  cancelar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
    @Body() dto: CancelarSolicitudDto,
  ): Promise<ResolucionCancelacion> {
    return this.solicitudesService.cancelar(
      usuario.id,
      usuario.rolActivo,
      solicitudId,
      dto,
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

  @Post(':id/elegir-oferta')
  @Roles(Rol.CLIENTE)
  elegirOferta(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
    @Body() dto: ElegirOfertaDto,
  ): Promise<PagoPublico> {
    return this.solicitudesService.elegirOferta(
      usuario.id,
      solicitudId,
      dto,
    );
  }

  @Post(':id/precio-final')
  @Roles(Rol.TRABAJADOR)
  registrarPrecioFinal(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
    @Body() dto: CrearPrecioFinalDto,
  ): Promise<PrecioPublico> {
    return this.solicitudesService.registrarPrecioFinal(
      usuario.id,
      solicitudId,
      dto,
    );
  }

  @Post(':id/precio-final/responder')
  @Roles(Rol.CLIENTE)
  responderPrecioFinal(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
    @Body() dto: ResponderPrecioDto,
  ): Promise<ResolucionPrecio> {
    return this.solicitudesService.responderPrecioFinal(
      usuario.id,
      solicitudId,
      dto,
    );
  }

  @Post(':id/incremento')
  @Roles(Rol.TRABAJADOR)
  registrarIncremento(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
    @Body() dto: CrearIncrementoDto,
  ): Promise<PrecioPublico> {
    return this.solicitudesService.registrarIncremento(
      usuario.id,
      solicitudId,
      dto,
    );
  }

  @Post(':id/incrementos/:precioId/responder')
  @Roles(Rol.CLIENTE)
  responderIncremento(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) solicitudId: string,
    @Param('precioId', new ParseUUIDPipe()) precioId: string,
    @Body() dto: ResponderPrecioDto,
  ): Promise<ResolucionPrecio> {
    return this.solicitudesService.responderIncremento(
      usuario.id,
      solicitudId,
      precioId,
      dto,
    );
  }
}
