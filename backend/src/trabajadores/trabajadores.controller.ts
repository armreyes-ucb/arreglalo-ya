import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ActualizarPerfilTrabajadorDto } from './dto/actualizar-perfil-trabajador.dto.js';
import { BuscarTrabajadoresQueryDto } from './dto/buscar-trabajadores-query.dto.js';
import type { PerfilTrabajadorPropio } from './interfaces/perfil-trabajador-propio.interface.js';
import type { TrabajadorMatch } from './interfaces/trabajador-match.interface.js';
import type { TrabajadorPerfilPublico } from './interfaces/trabajador-perfil-publico.interface.js';
import { TrabajadoresService } from './trabajadores.service.js';

@Controller('trabajadores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrabajadoresController {
  constructor(
    private readonly trabajadoresService: TrabajadoresService,
  ) {}

  @Get('perfil')
  @Roles(Rol.TRABAJADOR)
  obtenerPerfil(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<PerfilTrabajadorPropio> {
    return this.trabajadoresService.obtenerPerfilPropio(usuario.id);
  }

  @Patch('perfil')
  @Roles(Rol.TRABAJADOR)
  actualizarPerfil(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: ActualizarPerfilTrabajadorDto,
  ): Promise<PerfilTrabajadorPropio> {
    return this.trabajadoresService.actualizarPerfil(
      usuario.id,
      dto,
    );
  }

  @Get('buscar')
  @Roles(Rol.CLIENTE)
  buscar(
    @Query() query: BuscarTrabajadoresQueryDto,
  ): Promise<TrabajadorMatch[]> {
    return this.trabajadoresService.buscarTrabajadores(query);
  }

  @Get(':id')
  @Roles(Rol.CLIENTE)
  obtenerPerfilPublico(
    @Param('id', new ParseUUIDPipe()) perfilId: string,
  ): Promise<TrabajadorPerfilPublico> {
    return this.trabajadoresService.obtenerPerfilPublico(perfilId);
  }
}
