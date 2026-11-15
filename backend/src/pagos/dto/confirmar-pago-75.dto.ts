import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ConfirmarPago75Dto {
  @IsBoolean()
  confirmado: boolean;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motivo?: string;
}
