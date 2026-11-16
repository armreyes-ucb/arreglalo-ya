import { IsOptional, IsUUID } from 'class-validator';

export class ListarSuspensionesQueryDto {
  @IsOptional()
  @IsUUID()
  trabajador_id?: string;
}
