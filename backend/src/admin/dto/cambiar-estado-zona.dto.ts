import { IsBoolean } from 'class-validator';

/** Activa o desactiva una zona sin eliminar su historial. */
export class CambiarEstadoZonaDto {
  @IsBoolean()
  activa: boolean;
}
