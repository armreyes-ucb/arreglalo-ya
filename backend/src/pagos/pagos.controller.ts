import {
  Body,
  Controller,
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
import { ConfirmarPago75Dto } from './dto/confirmar-pago-75.dto.js';
import type { PagoPublico } from './interfaces/pago-publico.interface.js';
import type { ResolucionPagoFinal } from './interfaces/resolucion-pago-final.interface.js';
import { PagosService } from './pagos.service.js';

@Controller('pagos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post(':id/webhook-confirmar')
  @Roles(Rol.CLIENTE)
  confirmar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) pagoId: string,
  ): Promise<PagoPublico> {
    return this.pagosService.confirmarPago(usuario.id, pagoId);
  }

  @Patch(':id/ya-pague')
  @Roles(Rol.CLIENTE)
  marcarYaPague(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) pagoId: string,
  ): Promise<ResolucionPagoFinal> {
    return this.pagosService.marcarYaPague(usuario.id, pagoId);
  }

  @Patch(':id/confirmar-75')
  @Roles(Rol.TRABAJADOR)
  confirmarPago75(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) pagoId: string,
    @Body() dto: ConfirmarPago75Dto,
  ): Promise<ResolucionPagoFinal> {
    return this.pagosService.confirmarPago75(
      usuario.id,
      pagoId,
      dto,
    );
  }
}
