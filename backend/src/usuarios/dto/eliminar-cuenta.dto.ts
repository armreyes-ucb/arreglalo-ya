import { IsString, Length } from 'class-validator';

export class EliminarCuentaDto {
  @IsString()
  @Length(1, 72)
  password: string;
}
