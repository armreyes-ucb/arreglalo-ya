import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { ZonaPublica } from '../common/interfaces/zona-publica.interface.js';
import { ActualizarZonaDto } from './dto/actualizar-zona.dto.js';
import { CambiarEstadoZonaDto } from './dto/cambiar-estado-zona.dto.js';
import { CrearZonaDto } from './dto/crear-zona.dto.js';
import type {
  CoberturaZona,
  ZonaAdminResumen,
} from './interfaces/cobertura-zona.interface.js';
import { ZonasAdminService } from './zonas-admin.service.js';

/** RF34: configuración de zonas exclusiva del SUPERADMIN. */
@Controller('admin/zonas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN)
export class ZonasAdminController {
  constructor(private readonly zonasAdminService: ZonasAdminService) {}

  @Get()
  listar(): Promise<ZonaAdminResumen[]> {
    return this.zonasAdminService.listar();
  }

  @Post()
  crear(@Body() dto: CrearZonaDto): Promise<ZonaPublica> {
    return this.zonasAdminService.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarZonaDto,
  ): Promise<ZonaPublica> {
    return this.zonasAdminService.actualizar(id, dto);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoZonaDto,
  ): Promise<ZonaAdminResumen> {
    return this.zonasAdminService.cambiarEstado(id, dto.activa);
  }

  @Get(':id/cobertura')
  cobertura(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CoberturaZona> {
    return this.zonasAdminService.cobertura(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.zonasAdminService.eliminar(id);
  }
}
