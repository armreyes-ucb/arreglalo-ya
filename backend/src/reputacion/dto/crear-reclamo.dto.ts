import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearReclamoDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  motivo: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  evidencia_fotos?: string[];
}
