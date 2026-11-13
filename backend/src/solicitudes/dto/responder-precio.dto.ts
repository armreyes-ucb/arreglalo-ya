import { IsBoolean } from 'class-validator';

export class ResponderPrecioDto {
  @IsBoolean()
  aprobado: boolean;
}
