import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';

export class BuscarTrabajadoresQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zona_id: number;

  @IsOptional()
  @IsEnum(EspecialidadTipo)
  especialidad?: EspecialidadTipo;
}
