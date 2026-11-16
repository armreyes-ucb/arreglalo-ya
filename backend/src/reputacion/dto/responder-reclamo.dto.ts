import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResponderReclamoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  respuesta: string;
}
