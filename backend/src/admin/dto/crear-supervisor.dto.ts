import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { normalizarTelefono } from '../../common/utils/telefono.js';

/**
 * RF07: el superadministrador da de alta al supervisor. Si el teléfono ya
 * pertenece a un usuario activo, se promueve agregando el rol SUPERVISOR.
 */
export class CrearSupervisorDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizarTelefono(value) : value,
  )
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'El teléfono no es válido' })
  telefono: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 150)
  nombre_completo?: string;

  @IsOptional()
  @IsString()
  @Length(8, 72)
  password?: string;
}
