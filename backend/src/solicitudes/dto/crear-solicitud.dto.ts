import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';

export class CrearSolicitudDto {
  @IsInt()
  @Min(1)
  zona_id: number;

  @IsEnum(EspecialidadTipo)
  especialidad: EspecialidadTipo;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  tipo_problema: string;

  @IsString()
  @MinLength(30)
  @MaxLength(2000)
  descripcion: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  fotos_urls: string[];

  @IsString()
  @MinLength(5)
  @MaxLength(300)
  direccion_oculta: string;

  @IsDateString()
  fecha_cita_preferida: string;

  @IsOptional()
  @IsBoolean()
  urgente?: boolean;
}
