import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { DecisionReclamo } from '../../common/enums/decision-reclamo.enum.js';

export class ResolverReclamoDto {
  @IsEnum(DecisionReclamo)
  decision: DecisionReclamo;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  resolucion: string;
}
