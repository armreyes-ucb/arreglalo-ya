import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import type { SuspensionRegistrada } from './interfaces/suspension-registrada.interface.js';
import { SuspensionesService } from './suspensiones.service.js';

@Controller('suspensiones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuspensionesController {
  constructor(
    private readonly suspensionesService: SuspensionesService,
  ) {}

  @Get('mias')
  @Roles(Rol.TRABAJADOR)
  mias(
    @CurrentUser() usuario: AuthenticatedUser,
  ): Promise<SuspensionRegistrada[]> {
    return this.suspensionesService.mias(usuario.id);
  }
}
