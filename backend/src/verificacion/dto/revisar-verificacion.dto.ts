import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DecisionRevision } from '../../common/enums/decision-revision.enum.js';

export class RevisarVerificacionDto {
  @IsEnum(DecisionRevision)
  decision: DecisionRevision;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  nivel_verificacion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo_rechazo?: string;

  @IsOptional()
  @IsDateString()
  vence_antecedentes?: string;
}
