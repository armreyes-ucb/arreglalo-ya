import {
  BadRequestException,
  Injectable,
  Logger,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionClientesConflictivos } from '../entities/configuracion-clientes-conflictivos.entity.js';
import type { ActualizarConfiguracionConflictivosDto } from './dto/actualizar-configuracion-conflictivos.dto.js';
import {
  CONFIGURACION_CONFLICTIVOS_POR_DEFECTO,
  type ConfiguracionConflictivos,
} from './interfaces/configuracion-conflictivos.interface.js';

/**
 * RF32: criterios de detección persistidos en PostgreSQL (tabla
 * `configuracion_clientes_conflictivos`, fila única). Se mantiene una copia
 * en memoria para que la detección y las advertencias no consulten la base
 * en cada operación, igual que `ConfiguracionService`.
 */
@Injectable()
export class ConfiguracionConflictivosService implements OnModuleInit {
  private readonly logger = new Logger(
    ConfiguracionConflictivosService.name,
  );
  private actual: ConfiguracionConflictivos = {
    ...CONFIGURACION_CONFLICTIVOS_POR_DEFECTO,
    actualizado_en: new Date(0),
    actualizado_por: null,
  };

  constructor(
    @InjectRepository(ConfiguracionClientesConflictivos)
    private readonly configuracionRepository: Repository<ConfiguracionClientesConflictivos>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.actual = await this.cargar();
    } catch (error) {
      this.logger.warn(
        'No se pudieron cargar los criterios de clientes conflictivos; se usan los valores por defecto',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  get(): ConfiguracionConflictivos {
    return this.actual;
  }

  async actualizar(
    dto: ActualizarConfiguracionConflictivosDto,
    administradorId: string,
  ): Promise<ConfiguracionConflictivos> {
    const fila = await this.obtenerFila();
    if (dto.deteccion_activa !== undefined) {
      fila.deteccionActiva = dto.deteccion_activa;
    }
    if (dto.periodo_dias !== undefined) {
      fila.periodoDias = dto.periodo_dias;
    }
    if (dto.min_reclamos_rechazados !== undefined) {
      fila.minReclamosRechazados = dto.min_reclamos_rechazados;
    }
    if (dto.min_cancelaciones !== undefined) {
      fila.minCancelaciones = dto.min_cancelaciones;
    }
    if (dto.min_reportes !== undefined) {
      fila.minReportes = dto.min_reportes;
    }
    if (dto.min_reclamos_totales !== undefined) {
      fila.minReclamosTotales = dto.min_reclamos_totales;
    }

    if (fila.deteccionActiva && this.sinCriteriosActivos(fila)) {
      throw new BadRequestException(
        'Con la detección activa debe existir al menos un criterio con umbral mayor a cero',
      );
    }

    fila.actualizadoPorId = administradorId;
    const guardada = await this.configuracionRepository.save(fila);
    this.actual = this.mapear(guardada);
    return this.actual;
  }

  private sinCriteriosActivos(
    fila: ConfiguracionClientesConflictivos,
  ): boolean {
    return (
      fila.minReclamosRechazados === 0 &&
      fila.minCancelaciones === 0 &&
      fila.minReportes === 0 &&
      fila.minReclamosTotales === 0
    );
  }

  private async cargar(): Promise<ConfiguracionConflictivos> {
    const fila = await this.obtenerFila();
    return this.mapear(fila);
  }

  /**
   * Los valores iniciales se insertan con el script SQL. Si la fila no
   * existe (entorno nuevo) se crea con los valores por defecto para no
   * romper la aplicación.
   */
  private async obtenerFila(): Promise<ConfiguracionClientesConflictivos> {
    const existente = await this.configuracionRepository.findOne({
      where: { id: 1 },
    });
    if (existente) {
      return existente;
    }
    const nueva = this.configuracionRepository.create({
      id: 1,
      ...CONFIGURACION_CONFLICTIVOS_POR_DEFECTO,
      actualizadoPorId: null,
    });
    return this.configuracionRepository.save(nueva);
  }

  private mapear(
    fila: ConfiguracionClientesConflictivos,
  ): ConfiguracionConflictivos {
    return {
      deteccion_activa: fila.deteccionActiva,
      periodo_dias: fila.periodoDias,
      min_reclamos_rechazados: fila.minReclamosRechazados,
      min_cancelaciones: fila.minCancelaciones,
      min_reportes: fila.minReportes,
      min_reclamos_totales: fila.minReclamosTotales,
      actualizado_en: fila.actualizadoEn,
      actualizado_por: fila.actualizadoPorId,
    };
  }
}
