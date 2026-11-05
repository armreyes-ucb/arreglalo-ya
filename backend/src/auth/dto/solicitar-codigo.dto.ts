import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { normalizarTelefono } from '../../common/utils/telefono.js';

export class SolicitarCodigoDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizarTelefono(value) : value,
  )
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'El teléfono no es válido' })
  telefono: string;
}
