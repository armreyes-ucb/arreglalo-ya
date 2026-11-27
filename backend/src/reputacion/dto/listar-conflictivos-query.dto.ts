import { IsEnum, IsOptional } from 'class-validator';
import { EstadoClienteConflictivo } from '../../common/enums/estado-cliente-conflictivo.enum.js';

export class ListarConflictivosQueryDto {
  @IsOptional()
  @IsEnum(EstadoClienteConflictivo)
  estado?: EstadoClienteConflictivo;
}
