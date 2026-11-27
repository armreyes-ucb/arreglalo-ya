import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type {
  DevolucionConSaldoPublica,
  PagoConSaldoPublica,
} from '../pagos/interfaces/devolucion-publica.interface.js';
import { DevolucionesSupervisionService } from './devoluciones-supervision.service.js';
import { RegistrarDevolucionDto } from './dto/registrar-devolucion.dto.js';

@Controller('supervision/devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERVISOR, Rol.SUPERADMIN)
export class SupervisionDevolucionesController {
  constructor(
    private readonly devolucionesService: DevolucionesSupervisionService,
  ) {}

  @Get()
  listar(): Promise<DevolucionConSaldoPublica[]> {
    return this.devolucionesService.listar();
  }

  /** Pagos confirmados con su importe original, acumulado y saldo. */
  @Get('pagos')
  listarPagos(): Promise<PagoConSaldoPublica[]> {
    return this.devolucionesService.listarPagos();
  }

  /** Registra una devolución parcial validando el acumulado del pago. */
  @Post()
  registrar(
    @Body() dto: RegistrarDevolucionDto,
  ): Promise<DevolucionConSaldoPublica> {
    return this.devolucionesService.registrar(dto);
  }
}
