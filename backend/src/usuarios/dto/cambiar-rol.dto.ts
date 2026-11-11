import { IsIn } from 'class-validator';
import { Rol } from '../../common/enums/rol.enum.js';

export class CambiarRolDto {
  @IsIn(
    [Rol.CLIENTE, Rol.TRABAJADOR, Rol.SUPERVISOR, Rol.SUPERADMIN],
    {
      message:
        'El rol debe ser CLIENTE, TRABAJADOR, SUPERVISOR o SUPERADMIN',
    },
  )
  rol: Rol;
}
