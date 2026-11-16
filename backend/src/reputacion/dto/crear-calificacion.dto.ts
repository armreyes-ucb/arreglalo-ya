import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CrearCalificacionDto {
  @IsUUID()
  solicitud_id: string;

  @IsInt()
  @Min(1)
  @Max(5)
  estrellas: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  calidad?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  puntualidad?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  trato?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  precio_justo?: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  comentario?: string;
}
