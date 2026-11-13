import { IsNumber, Min } from 'class-validator';

export class CrearPrecioFinalDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.5)
  monto: number;
}
