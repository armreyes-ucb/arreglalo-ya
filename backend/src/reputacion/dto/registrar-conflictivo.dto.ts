import {
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistrarConflictivoDto {
  @IsUUID()
  cliente_id: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motivo: string;
}
