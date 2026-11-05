import {
  Body,
  Controller,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthTokenResponse } from '../auth/interfaces/auth-token-response.interface.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { ActivarTrabajadorDto } from './dto/activar-trabajador.dto.js';
import { CambiarRolDto } from './dto/cambiar-rol.dto.js';
import type { ActivacionTrabajadorResponse } from './interfaces/activacion-trabajador-response.interface.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Patch('cambiar-rol')
  cambiarRol(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: CambiarRolDto,
  ): Promise<AuthTokenResponse> {
    return this.usuariosService.cambiarRol(usuario.id, dto);
  }

  @Post('activar-trabajador')
  activarTrabajador(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: ActivarTrabajadorDto,
  ): Promise<ActivacionTrabajadorResponse> {
    return this.usuariosService.activarTrabajador(usuario.id, dto);
  }
}
