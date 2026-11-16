import {
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AplicarSuspensionDto {
  @IsUUID()
  trabajador_id: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motivo: string;
}
