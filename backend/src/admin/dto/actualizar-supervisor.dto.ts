import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';

/** RF07: edición de los datos de un supervisor existente. */
export class ActualizarSupervisorDto {
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
