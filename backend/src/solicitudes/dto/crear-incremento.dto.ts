import {
  IsNumber,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CrearIncrementoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  monto: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motivo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  foto_evidencia_url: string;
}
