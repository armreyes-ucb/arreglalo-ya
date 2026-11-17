import {
  Body,
  Controller,
  Delete,
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
import type { UsuarioPublico } from '../common/interfaces/usuario-publico.interface.js';
import { ActualizarSupervisorDto } from './dto/actualizar-supervisor.dto.js';
import { CrearSupervisorDto } from './dto/crear-supervisor.dto.js';
import type { SupervisorCreado } from './interfaces/supervisor-creado.interface.js';
import { SupervisoresService } from './supervisores.service.js';

/**
 * RF07 / CP16: únicamente el SUPERADMIN. Un SUPERVISOR que intente crear
 * otro supervisor recibe 403 Forbidden por el RolesGuard.
 */
@Controller('admin/supervisores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN)
export class SupervisoresController {
  constructor(
    private readonly supervisoresService: SupervisoresService,
  ) {}

  @Get()
  listar(): Promise<UsuarioPublico[]> {
    return this.supervisoresService.listar();
  }

  @Post()
  crear(@Body() dto: CrearSupervisorDto): Promise<SupervisorCreado> {
    return this.supervisoresService.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarSupervisorDto,
  ): Promise<UsuarioPublico> {
    return this.supervisoresService.actualizar(id, dto);
  }

  @Patch(':id/desactivar')
  desactivar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<UsuarioPublico> {
    return this.supervisoresService.desactivar(id, usuario.id);
  }

  @Patch(':id/reactivar')
  reactivar(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UsuarioPublico> {
    return this.supervisoresService.reactivar(id);
  }

  /** Alias REST: desactivar no borra la cuenta ni su historial. */
  @Delete(':id')
  desactivarPorDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<UsuarioPublico> {
    return this.supervisoresService.desactivar(id, usuario.id);
  }
}
