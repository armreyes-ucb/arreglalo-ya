import { IsDateString, IsOptional } from 'class-validator';

/** RF34: filtros de fecha para los reportes (inclusive por día). */
export class ReporteQueryDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  /** Alias equivalente a `desde`. */
  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  /** Alias equivalente a `hasta`. */
  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;
}
