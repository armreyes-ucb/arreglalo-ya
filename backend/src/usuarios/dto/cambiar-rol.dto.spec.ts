import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { Rol } from '../../common/enums/rol.enum.js';
import { CambiarRolDto } from './cambiar-rol.dto.js';

describe('CambiarRolDto', () => {
  it('acepta los cuatro roles del sistema', async () => {
    for (const rol of [
      Rol.CLIENTE,
      Rol.TRABAJADOR,
      Rol.SUPERVISOR,
      Rol.SUPERADMIN,
    ]) {
      const dto = plainToInstance(CambiarRolDto, { rol });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('rechaza roles desconocidos', async () => {
    const dto = plainToInstance(CambiarRolDto, { rol: 'ADMIN' });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
