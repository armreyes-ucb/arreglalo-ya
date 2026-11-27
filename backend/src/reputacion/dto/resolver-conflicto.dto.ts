import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { DecisionConflicto } from '../../common/enums/decision-conflicto.enum.js';

export class ResolverConflictoDto {
  @IsEnum(DecisionConflicto)
  decision: DecisionConflicto;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  justificacion: string;
}
