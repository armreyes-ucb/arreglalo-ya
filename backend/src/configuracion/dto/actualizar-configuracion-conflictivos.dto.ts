import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * RF32/RF34: criterios de detección. Todos los campos son opcionales; el
 * servicio mezcla los valores enviados con los vigentes. 0 desactiva el
 * umbral correspondiente.
 */
export class ActualizarConfiguracionConflictivosDto {
  @IsOptional()
  @IsBoolean()
  deteccion_activa?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  periodo_dias?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  min_reclamos_rechazados?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  min_cancelaciones?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  min_reportes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  min_reclamos_totales?: number;
}
