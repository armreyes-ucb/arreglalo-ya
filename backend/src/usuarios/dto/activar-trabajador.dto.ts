import {
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
} from 'class-validator';
import { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';

export class ActivarTrabajadorDto {
  @IsBoolean()
  @Equals(true, { message: 'Debe aceptar el contrato digital' })
  acepto_contrato_digital: boolean;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe elegir al menos una especialidad' })
  @ArrayUnique()
  @IsEnum(EspecialidadTipo, {
    each: true,
    message: 'La especialidad no es válida',
  })
  especialidades: EspecialidadTipo[];

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe elegir al menos una zona' })
  @ArrayUnique()
  @IsInt({ each: true, message: 'Cada zona debe ser un ID numérico' })
  zonas: number[];
}
