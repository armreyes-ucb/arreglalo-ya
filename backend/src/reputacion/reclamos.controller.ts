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
import { CrearReclamoDto } from './dto/crear-reclamo.dto.js';
import { ResolverReclamoDto } from './dto/resolver-reclamo.dto.js';
import { ResponderReclamoDto } from './dto/responder-reclamo.dto.js';
import type { ReclamoPublico } from './interfaces/reclamo-publico.interface.js';
import type { ResolucionReclamo } from './interfaces/resolucion-reclamo.interface.js';
import { ReclamosService } from './reclamos.service.js';

@Controller('reclamos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReclamosController {
  constructor(private readonly reclamosService: ReclamosService) {}

  @Post()
  @Roles(Rol.CLIENTE)
  crear(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: CrearReclamoDto,
  ): Promise<ReclamoPublico> {
    return this.reclamosService.crear(usuario.id, dto);
  }

  @Patch(':id/responder')
  @Roles(Rol.TRABAJADOR)
  responder(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) reclamoId: string,
    @Body() dto: ResponderReclamoDto,
  ): Promise<ReclamoPublico> {
    return this.reclamosService.responder(
      usuario.id,
      reclamoId,
      dto,
    );
  }

  @Patch(':id/resolver')
  @Roles(Rol.SUPERVISOR)
  resolver(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) reclamoId: string,
    @Body() dto: ResolverReclamoDto,
  ): Promise<ResolucionReclamo> {
    return this.reclamosService.resolver(
      usuario.id,
      reclamoId,
      dto,
    );
  }

  @Get('bandeja')
  @Roles(Rol.SUPERVISOR)
  bandeja(): Promise<ReclamoPublico[]> {
    return this.reclamosService.bandeja();
  }

  @Get('mios')
  @Roles(Rol.CLIENTE)
  mios(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ReclamoPublico[]> {
    return this.reclamosService.mios(usuario.id);
  }

  @Get('asignados')
  @Roles(Rol.TRABAJADOR)
  asignados(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<ReclamoPublico[]> {
    return this.reclamosService.asignados(usuario.id);
  }
}
