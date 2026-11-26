import { IsInt, Max, Min } from 'class-validator';

/**
 * Periodo mínimo sin ofertas para generar una alerta. Se expresa en minutos
 * para poder probar el flujo con valores bajos (por ejemplo 1-5 minutos).
 */
export class ActualizarConfiguracionAlertaDto {
  @IsInt()
  @Min(1)
  @Max(43200)
  minutos_sin_ofertas: number;
}
