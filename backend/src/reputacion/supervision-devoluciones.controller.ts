import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { DevolucionPublica } from '../pagos/interfaces/devolucion-publica.interface.js';
import { DevolucionesSupervisionService } from './devoluciones-supervision.service.js';

@Controller('supervision/devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
export class SupervisionDevolucionesController {
  constructor(
    private readonly devolucionesService: DevolucionesSupervisionService,
  ) {}

  @Get()
  listar(): Promise<DevolucionPublica[]> {
    return this.devolucionesService.listar();
  }
}