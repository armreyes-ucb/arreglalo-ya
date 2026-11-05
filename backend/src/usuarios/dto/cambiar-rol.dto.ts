import { IsIn } from 'class-validator';
import { Rol } from '../../common/enums/rol.enum.js';

export class CambiarRolDto {
  @IsIn([Rol.CLIENTE, Rol.TRABAJADOR], {
    message: 'El rol debe ser CLIENTE o TRABAJADOR',
  })
  rol: Rol;
}
