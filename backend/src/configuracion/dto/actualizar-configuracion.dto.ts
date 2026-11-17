import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * RF34: todos los campos son opcionales; solo se actualiza lo enviado.
 * Los límites gruesos se validan aquí y las reglas cruzadas en el servicio.
 */
export class ActualizarConfiguracionDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  comision_pct?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  @Max(100)
  pago_inicial_pct?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  factor_urgente?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  minutos_vigencia_qr?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  horas_cancelacion_sin_penalidad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  dias_habiles_devolucion?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  horas_cierre_automatico?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  dias_caducidad_solicitud?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  dias_tope_urgente?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  dias_pausa_maxima?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  dias_pausa_baja?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  dias_aviso_antecedentes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  dias_reclamo?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  horas_respuesta_reclamo?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  horas_sla_supervisor?: number;
}
