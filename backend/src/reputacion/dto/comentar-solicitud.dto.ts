import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * RF29 + CP10: el comentario puede registrarse o editarse sin límite de
 * días desde el cierre. Si el autor todavía no calificó la solicitud,
 * debe enviar las estrellas en la misma petición.
 */
export class ComentarSolicitudDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  comentario: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  estrellas?: number;

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
}
