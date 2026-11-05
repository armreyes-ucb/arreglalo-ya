import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { AuthService } from '../auth/auth.service.js';
import type { AuthTokenResponse } from '../auth/interfaces/auth-token-response.interface.js';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import type { Zona } from '../entities/zona.entity.js';
import type { ActivarTrabajadorDto } from './dto/activar-trabajador.dto.js';
import type { CambiarRolDto } from './dto/cambiar-rol.dto.js';
import { UsuariosService } from './usuarios.service.js';

const USUARIO_ID = '11111111-1111-4111-8111-111111111111';
const PERFIL_ID = '22222222-2222-4222-8222-222222222222';

function crearUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: USUARIO_ID,
    nombreCompleto: 'Usuario Prueba',
    telefono: '+59170000001',
    passwordHash: 'hash',
    roles: [Rol.CLIENTE],
    estado: EstadoUsuario.ACTIVO,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    aceptoTerminos: true,
    fechaRegistro: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function crearPerfil(
  overrides: Partial<PerfilTrabajador> = {},
): PerfilTrabajador {
  return {
    id: PERFIL_ID,
    usuarioId: USUARIO_ID,
    especialidades: [EspecialidadTipo.PLOMERIA],
    horarios: null,
    preciosEstimados: {},
    nivelVerificacion: 0,
    promedio: 0,
    trabajosCompletados: 0,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.PENDIENTE,
    fechaPausa: null,
    venceAntecedentes: null,
    ...overrides,
  };
}

function crearZona(id: number): Zona {
  return {
    id,
    nombre: 'Norte',
    otb: `OTB ${id}`,
    municipio: 'Cercado',
    zonasVecinas: [],
  };
}

function respuestaToken(rol: Rol): AuthTokenResponse {
  return {
    access_token: 'token',
    token_type: 'Bearer',
    expires_in: '7d',
    rol_activo: rol,
    usuario: {
      id: USUARIO_ID,
      nombre_completo: 'Usuario Prueba',
      telefono: '+59170000001',
      roles: [Rol.CLIENTE, Rol.TRABAJADOR],
      estado: EstadoUsuario.ACTIVO,
      fecha_registro: new Date('2026-01-01T00:00:00.000Z'),
    },
  };
}

describe('UsuariosService', () => {
  let usuarioRepo: { findOne: ReturnType<typeof vi.fn> };
  let perfilRepo: { findOne: ReturnType<typeof vi.fn> };
  let zonaRepo: { findBy: ReturnType<typeof vi.fn> };
  let dataSource: { transaction: ReturnType<typeof vi.fn> };
  let authService: { emitirToken: ReturnType<typeof vi.fn> };
  let service: UsuariosService;

  beforeEach(() => {
    usuarioRepo = { findOne: vi.fn() };
    perfilRepo = { findOne: vi.fn() };
    zonaRepo = { findBy: vi.fn() };
    dataSource = { transaction: vi.fn() };
    authService = { emitirToken: vi.fn() };
    service = new UsuariosService(
      usuarioRepo as unknown as Repository<Usuario>,
      perfilRepo as unknown as Repository<PerfilTrabajador>,
      zonaRepo as unknown as Repository<Zona>,
      dataSource as unknown as DataSource,
      authService as unknown as AuthService,
    );
  });

  it('no permite cambiar a TRABAJADOR sin perfil', async () => {
    usuarioRepo.findOne.mockResolvedValue(
      crearUsuario({ roles: [Rol.CLIENTE, Rol.TRABAJADOR] }),
    );
    perfilRepo.findOne.mockResolvedValue(null);
    const dto: CambiarRolDto = { rol: Rol.TRABAJADOR };
    await expect(
      service.cambiarRol(USUARIO_ID, dto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('cambia a CLIENTE sin exigir perfil', async () => {
    usuarioRepo.findOne.mockResolvedValue(
      crearUsuario({ roles: [Rol.CLIENTE, Rol.TRABAJADOR] }),
    );
    authService.emitirToken.mockResolvedValue(
      respuestaToken(Rol.CLIENTE),
    );
    const dto: CambiarRolDto = { rol: Rol.CLIENTE };
    const resultado = await service.cambiarRol(USUARIO_ID, dto);
    expect(resultado.rol_activo).toBe(Rol.CLIENTE);
    expect(perfilRepo.findOne).not.toHaveBeenCalled();
  });

  it('cambia a TRABAJADOR si el perfil existe', async () => {
    usuarioRepo.findOne.mockResolvedValue(
      crearUsuario({ roles: [Rol.CLIENTE, Rol.TRABAJADOR] }),
    );
    perfilRepo.findOne.mockResolvedValue(crearPerfil());
    authService.emitirToken.mockResolvedValue(
      respuestaToken(Rol.TRABAJADOR),
    );
    const dto: CambiarRolDto = { rol: Rol.TRABAJADOR };
    const resultado = await service.cambiarRol(USUARIO_ID, dto);
    expect(resultado.rol_activo).toBe(Rol.TRABAJADOR);
  });

  it('rechaza un rol no habilitado', async () => {
    usuarioRepo.findOne.mockResolvedValue(crearUsuario());
    const dto: CambiarRolDto = { rol: Rol.TRABAJADOR };
    await expect(
      service.cambiarRol(USUARIO_ID, dto),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no activa sin aceptar el contrato digital', async () => {
    const dto: ActivarTrabajadorDto = {
      acepto_contrato_digital: false,
      especialidades: [EspecialidadTipo.PLOMERIA],
      zonas: [1],
    };
    await expect(
      service.activarTrabajador(USUARIO_ID, dto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige al menos una especialidad y una zona', async () => {
    const sinEspecialidades: ActivarTrabajadorDto = {
      acepto_contrato_digital: true,
      especialidades: [],
      zonas: [1],
    };
    const sinZonas: ActivarTrabajadorDto = {
      acepto_contrato_digital: true,
      especialidades: [EspecialidadTipo.PLOMERIA],
      zonas: [],
    };
    await expect(
      service.activarTrabajador(USUARIO_ID, sinEspecialidades),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.activarTrabajador(USUARIO_ID, sinZonas),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si el perfil ya existe', async () => {
    usuarioRepo.findOne.mockResolvedValue(crearUsuario());
    perfilRepo.findOne.mockResolvedValue(crearPerfil());
    const dto: ActivarTrabajadorDto = {
      acepto_contrato_digital: true,
      especialidades: [EspecialidadTipo.PLOMERIA],
      zonas: [1],
    };
    await expect(
      service.activarTrabajador(USUARIO_ID, dto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza zonas inexistentes', async () => {
    usuarioRepo.findOne.mockResolvedValue(crearUsuario());
    perfilRepo.findOne.mockResolvedValue(null);
    zonaRepo.findBy.mockResolvedValue([crearZona(1)]);
    const dto: ActivarTrabajadorDto = {
      acepto_contrato_digital: true,
      especialidades: [EspecialidadTipo.PLOMERIA],
      zonas: [1, 99],
    };
    await expect(
      service.activarTrabajador(USUARIO_ID, dto),
    ).rejects.toThrow('Zonas no encontradas: 99');
  });

  it('activa el rol de trabajador en una transacción', async () => {
    const usuarioActualizado = crearUsuario({
      roles: [Rol.CLIENTE, Rol.TRABAJADOR],
    });
    const perfilGuardado = crearPerfil();
    const manager = {
      create: vi.fn(
        (_entidad: unknown, datos: unknown) => datos,
      ),
      save: vi.fn().mockResolvedValue(perfilGuardado),
      insert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      findOneOrFail: vi.fn().mockResolvedValue(usuarioActualizado),
    };
    usuarioRepo.findOne.mockResolvedValue(crearUsuario());
    perfilRepo.findOne.mockResolvedValue(null);
    zonaRepo.findBy.mockResolvedValue([crearZona(1), crearZona(2)]);
    dataSource.transaction.mockImplementation(
      async (callback: (managerFalso: typeof manager) => unknown) =>
        callback(manager),
    );
    authService.emitirToken.mockResolvedValue(
      respuestaToken(Rol.TRABAJADOR),
    );
    const dto: ActivarTrabajadorDto = {
      acepto_contrato_digital: true,
      especialidades: [EspecialidadTipo.PLOMERIA],
      zonas: [1, 2],
    };
    const resultado = await service.activarTrabajador(
      USUARIO_ID,
      dto,
    );
    expect(resultado.perfil.estado).toBe(
      EstadoTrabajador.PENDIENTE,
    );
    expect(resultado.perfil.acepto_contrato_digital).toBe(true);
    expect(resultado.zonas).toHaveLength(2);
    expect(resultado.rol_activo).toBe(Rol.TRABAJADOR);
    expect(manager.insert).toHaveBeenCalledWith(TrabajadorZona, [
      { trabajadorId: PERFIL_ID, zonaId: 1 },
      { trabajadorId: PERFIL_ID, zonaId: 2 },
    ]);
    expect(manager.update).toHaveBeenCalledWith(Usuario, USUARIO_ID, {
      roles: [Rol.CLIENTE, Rol.TRABAJADOR],
    });
    expect(authService.emitirToken).toHaveBeenCalledWith(
      usuarioActualizado,
      Rol.TRABAJADOR,
    );
  });
});
