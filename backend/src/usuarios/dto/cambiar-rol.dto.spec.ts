import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { Rol } from '../../common/enums/rol.enum.js';
import { CambiarRolDto } from './cambiar-rol.dto.js';

describe('CambiarRolDto', () => {
  it('acepta CLIENTE y TRABAJADOR', async () => {
    for (const rol of [Rol.CLIENTE, Rol.TRABAJADOR]) {
      const dto = plainToInstance(CambiarRolDto, { rol });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('rechaza SUPERVISOR y SUPERADMIN', async () => {
    for (const rol of [Rol.SUPERVISOR, Rol.SUPERADMIN]) {
      const dto = plainToInstance(CambiarRolDto, { rol });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    }
  });
});
