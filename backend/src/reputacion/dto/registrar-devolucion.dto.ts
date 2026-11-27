import {
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegistrarDevolucionDto {
  @IsUUID()
  pago_id: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motivo: string;
}
