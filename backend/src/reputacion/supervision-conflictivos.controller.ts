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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { ConflictivosService } from './conflictivos.service.js';
import { ListarConflictivosQueryDto } from './dto/listar-conflictivos-query.dto.js';
import { RegistrarConflictivoDto } from './dto/registrar-conflictivo.dto.js';
import { ResolverConflictoDto } from './dto/resolver-conflicto.dto.js';
import type { ClienteConflictivoPublico } from './interfaces/cliente-conflictivo-publico.interface.js';
import type { DetalleConflictoPublico } from './interfaces/detalle-conflicto.interface.js';
import type { ResolucionConflictoPublica } from './interfaces/resolucion-conflicto.interface.js';
import type { ResumenDeteccion } from './interfaces/resumen-deteccion.interface.js';

/**
 * RF32 + CP27: solo supervisión ve el listado completo. Los trabajadores
 * reciben únicamente el booleano `advertir_cliente_conflictivo` en sus
 * solicitudes, nunca la tabla ni datos privados de otros clientes.
 */
@Controller('supervision/clientes-conflictivos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupervisionConflictivosController {
  constructor(
    private readonly conflictivosService: ConflictivosService,
  ) {}

  @Get()
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  listar(
    @Query() query: ListarConflictivosQueryDto,
  ): Promise<ClienteConflictivoPublico[]> {
    return this.conflictivosService.listar(query);
  }

  @Post('detectar')
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  detectar(): Promise<ResumenDeteccion> {
    return this.conflictivosService.detectar();
  }

  @Get(':clienteId')
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  obtener(
    @Param('clienteId', new ParseUUIDPipe()) clienteId: string,
  ): Promise<ClienteConflictivoPublico> {
    return this.conflictivosService.obtener(clienteId);
  }

  @Get(':clienteId/detalle')
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  detalle(
    @Param('clienteId', new ParseUUIDPipe()) clienteId: string,
  ): Promise<DetalleConflictoPublico> {
    return this.conflictivosService.detalle(clienteId);
  }

  @Get(':clienteId/resoluciones')
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  resoluciones(
    @Param('clienteId', new ParseUUIDPipe()) clienteId: string,
  ): Promise<ResolucionConflictoPublica[]> {
    return this.conflictivosService.resoluciones(clienteId);
  }

  @Post(':clienteId/resolver')
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  resolver(
    @Param('clienteId', new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: ResolverConflictoDto,
  ): Promise<ResolucionConflictoPublica> {
    return this.conflictivosService.resolver(clienteId, dto, usuario.id);
  }

  @Post()
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  registrar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: RegistrarConflictivoDto,
  ): Promise<ClienteConflictivoPublico> {
    return this.conflictivosService.registrar(dto, usuario.id);
  }
}
