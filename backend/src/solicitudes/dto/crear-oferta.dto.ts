import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CrearOfertaDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  precio_estimado: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo_transporte: number;

  @IsDateString()
  fecha_propuesta: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mensaje?: string;

  @IsOptional()
  @IsString()
  @MinLength(15)
  @MaxLength(500)
  justificacion_fuera_de_zona?: string;
}
