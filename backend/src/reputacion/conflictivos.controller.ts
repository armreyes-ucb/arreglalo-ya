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

@Controller('clientes-conflictivos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConflictivosController {
  constructor(
    private readonly conflictivosService: ConflictivosService,
  ) {}

  @Get()
  @Roles(Rol.TRABAJADOR, Rol.SUPERVISOR)
  listar(): Promise<ClienteConflictivoPublico[]> {
    return this.conflictivosService.listar();
  }

  @Get(':clienteId')
  @Roles(Rol.TRABAJADOR, Rol.SUPERVISOR)
  obtener(
    @Param('clienteId', new ParseUUIDPipe()) clienteId: string,
  ): Promise<ClienteConflictivoPublico> {
    return this.conflictivosService.obtener(clienteId);
  }

  @Post()
  @Roles(Rol.SUPERVISOR)
  registrar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: RegistrarConflictivoDto,
  ): Promise<ClienteConflictivoPublico> {
    return this.conflictivosService.registrar(dto, usuario.id);
  }
}
