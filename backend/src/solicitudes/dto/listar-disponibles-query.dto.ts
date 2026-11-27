import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';

export class ListarDisponiblesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zona_id?: number;

  @IsOptional()
  @IsEnum(EspecialidadTipo)
  especialidad?: EspecialidadTipo;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  incluir_fuera_de_zona?: boolean;
}
