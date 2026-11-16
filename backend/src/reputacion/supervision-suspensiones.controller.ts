import {
  Body,
  Controller,
  Get,
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
import { AplicarSuspensionDto } from './dto/aplicar-suspension.dto.js';
import { ListarSuspensionesQueryDto } from './dto/listar-suspensiones-query.dto.js';
import type { SuspensionRegistrada } from './interfaces/suspension-registrada.interface.js';
import { SuspensionesService } from './suspensiones.service.js';

@Controller('supervision/suspensiones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupervisionSuspensionesController {
  constructor(
    private readonly suspensionesService: SuspensionesService,
  ) {}

  @Get()
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  listar(
    @Query() query: ListarSuspensionesQueryDto,
  ): Promise<SuspensionRegistrada[]> {
    return this.suspensionesService.listar(query);
  }

  @Post()
  @Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
  aplicar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: AplicarSuspensionDto,
  ): Promise<SuspensionRegistrada> {
    return this.suspensionesService.aplicar(dto, usuario.id);
  }
}
