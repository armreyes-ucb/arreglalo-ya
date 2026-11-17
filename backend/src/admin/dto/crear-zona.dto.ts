import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/** RF34: alta de zonas/vecindades desde el panel de administración. */
export class CrearZonaDto {
  @IsString()
  @Length(1, 50)
  nombre: string;

  @IsString()
  @Length(1, 100)
  otb: string;

  @IsString()
  @Length(1, 100)
  municipio: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  zonas_vecinas?: string[];
}
