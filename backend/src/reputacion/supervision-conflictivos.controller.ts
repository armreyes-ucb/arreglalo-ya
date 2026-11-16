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
import { ConflictivosService } from './conflictivos.service.js';
import { RegistrarConflictivoDto } from './dto/registrar-conflictivo.dto.js';
import type { ClienteConflictivoPublico } from './interfaces/cliente-conflictivo-publico.interface.js';

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
  listar(): Promise<ClienteConflictivoPublico[]> {
    return this.conflictivosService.listar();
  }

  @Get(':clienteId')
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  obtener(
    @Param('clienteId', new ParseUUIDPipe()) clienteId: string,
  ): Promise<ClienteConflictivoPublico> {
    return this.conflictivosService.obtener(clienteId);
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
