import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';

export class ActualizarPerfilTrabajadorDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(EspecialidadTipo, { each: true })
  especialidades?: EspecialidadTipo[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  horarios?: string;

  @IsOptional()
  @IsObject()
  precios_estimados?: Record<string, number>;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  zonas_ids?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  fotos_urls?: string[];
}
