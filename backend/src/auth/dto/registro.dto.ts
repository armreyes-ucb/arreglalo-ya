import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { normalizarTelefono } from '../../common/utils/telefono.js';

export class RegistroDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 150)
  nombre_completo: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? normalizarTelefono(value) : value,
  )
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'El teléfono no es válido' })
  telefono: string;

  @IsString()
  @Length(8, 72)
  password: string;

  @IsBoolean()
  @Equals(true, { message: 'Debe aceptar los términos y condiciones' })
  acepto_terminos: boolean;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  codigo: string;
}
