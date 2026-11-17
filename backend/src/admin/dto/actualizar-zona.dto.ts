import {
  IsArray,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/** RF34: edición parcial de una zona. */
export class ActualizarZonaDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  otb?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  municipio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  zonas_vecinas?: string[];
}
