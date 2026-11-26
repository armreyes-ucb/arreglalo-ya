import { IsDateString } from 'class-validator';

export class AmpliarPlazoDto {
  /** Nueva fecha y hora límite para recibir propuestas (ISO 8601). */
  @IsDateString()
  nueva_fecha: string;
}
