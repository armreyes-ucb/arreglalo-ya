import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { ReporteQueryDto } from './dto/reporte-query.dto.js';
import type {
  ReporteAdministrativo,
  ReporteComisiones,
  ReporteDevoluciones,
  ReporteReclamos,
  ReporteSolicitudes,
} from './interfaces/reporte-administrativo.interface.js';
import { ReportesService } from './reportes.service.js';

/** RF34c: reportes JSON exclusivos del SUPERADMIN. */
@Controller('admin/reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get()
  generar(
    @Query() query: ReporteQueryDto,
  ): Promise<ReporteAdministrativo> {
    return this.reportesService.generar(
      query.desde ?? query.fecha_desde,
      query.hasta ?? query.fecha_hasta,
    );
  }

  @Get('solicitudes')
  solicitudes(
    @Query() query: ReporteQueryDto,
  ): Promise<ReporteSolicitudes> {
    return this.reportesService.reporteSolicitudes(
      query.desde ?? query.fecha_desde,
      query.hasta ?? query.fecha_hasta,
    );
  }

  @Get('comisiones')
  comisiones(
    @Query() query: ReporteQueryDto,
  ): Promise<ReporteComisiones> {
    return this.reportesService.reporteComisiones(
      query.desde ?? query.fecha_desde,
      query.hasta ?? query.fecha_hasta,
    );
  }

  @Get('devoluciones')
  devoluciones(
    @Query() query: ReporteQueryDto,
  ): Promise<ReporteDevoluciones> {
    return this.reportesService.reporteDevoluciones(
      query.desde ?? query.fecha_desde,
      query.hasta ?? query.fecha_hasta,
    );
  }

  @Get('reclamos')
  reclamos(
    @Query() query: ReporteQueryDto,
  ): Promise<ReporteReclamos> {
    return this.reportesService.reporteReclamos(
      query.desde ?? query.fecha_desde,
      query.hasta ?? query.fecha_hasta,
    );
  }
}
