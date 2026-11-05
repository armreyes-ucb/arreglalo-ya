import bcrypt from 'bcrypt';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { Usuario } from '../entities/usuario.entity.js';
import { AuthService } from './auth.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegistroDto } from './dto/registro.dto.js';
import { SmsVerificationService } from './sms-verification.service.js';

function crearUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    nombreCompleto: 'Usuario Prueba',
    telefono: '+59170000001',
    passwordHash: '',
    roles: [Rol.CLIENTE],
    estado: EstadoUsuario.ACTIVO,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    aceptoTerminos: true,
    fechaRegistro: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

async function capturarError(promesa: Promise<unknown>): Promise<unknown> {
  try {
    await promesa;
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba un error');
}

describe('AuthService', () => {
  let usuarioRepo: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };
  let configService: { get: ReturnType<typeof vi.fn> };
  let smsService: SmsVerificationService;
  let service: AuthService;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    usuarioRepo = {
      findOne: vi.fn(),
      create: vi.fn((data: Partial<Usuario>) => data),
      save: vi.fn(async (usuario: Usuario) =>
        Object.assign({}, usuario, {
          id:
            usuario.id ??
            '11111111-1111-4111-8111-111111111111',
          fechaRegistro:
            usuario.fechaRegistro ??
            new Date('2026-01-01T00:00:00.000Z'),
        }),
      ),
      update: vi.fn(),
    };
    jwtService = {
      signAsync: vi.fn().mockResolvedValue('jwt-token'),
    };
    configService = {
      get: vi.fn().mockReturnValue('7d'),
    };
    smsService = new SmsVerificationService();
    service = new AuthService(
      usuarioRepo as unknown as Repository<Usuario>,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      smsService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('registra un usuario con rol CLIENTE y términos aceptados', async () => {
    usuarioRepo.findOne.mockResolvedValue(null);
    const codigoResponse =
      await service.solicitarCodigo('+591 700-00001');
    const codigo = codigoResponse.codigo_desarrollo;
    if (!codigo) {
      throw new Error('El código de desarrollo no fue generado');
    }
    const dto: RegistroDto = {
      nombre_completo: '  Usuario Prueba  ',
      telefono: '+591 700-00001',
      password: 'Password123',
      acepto_terminos: true,
      codigo,
    };
    const resultado = await service.registro(dto);
    expect(resultado.roles).toEqual([Rol.CLIENTE]);
    expect(resultado.telefono).toBe('+59170000001');
    expect(resultado.nombre_completo).toBe('Usuario Prueba');
    expect('passwordHash' in resultado).toBe(false);
    expect(usuarioRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreCompleto: 'Usuario Prueba',
        telefono: '+59170000001',
        roles: [Rol.CLIENTE],
        estado: EstadoUsuario.ACTIVO,
        aceptoTerminos: true,
      }),
    );
    const guardado = usuarioRepo.save.mock.calls[0][0] as Usuario;
    expect(guardado.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('rechaza registro con teléfono duplicado', async () => {
    usuarioRepo.findOne.mockResolvedValue(crearUsuario());
    const dto: RegistroDto = {
      nombre_completo: 'Usuario Prueba',
      telefono: '+59170000001',
      password: 'Password123',
      acepto_terminos: true,
      codigo: '123456',
    };
    await expect(service.registro(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rechaza registro con código inválido', async () => {
    usuarioRepo.findOne.mockResolvedValue(null);
    const codigoResponse =
      await service.solicitarCodigo('+59170000001');
    const codigo = codigoResponse.codigo_desarrollo;
    if (!codigo) {
      throw new Error('El código de desarrollo no fue generado');
    }
    const incorrecto = codigo === '000000' ? '111111' : '000000';
    const dto: RegistroDto = {
      nombre_completo: 'Usuario Prueba',
      telefono: '+59170000001',
      password: 'Password123',
      acepto_terminos: true,
      codigo: incorrecto,
    };
    await expect(service.registro(dto)).rejects.toThrow('incorrecto');
  });

  it('inicia sesión y devuelve token con rol CLIENTE', async () => {
    const hash = await bcrypt.hash('Password123', 4);
    usuarioRepo.findOne.mockResolvedValue(
      crearUsuario({ passwordHash: hash }),
    );
    const dto: LoginDto = {
      telefono: '+59170000001',
      password: 'Password123',
    };
    const resultado = await service.login(dto);
    expect(resultado.access_token).toBe('jwt-token');
    expect(resultado.token_type).toBe('Bearer');
    expect(resultado.expires_in).toBe('7d');
    expect(resultado.rol_activo).toBe(Rol.CLIENTE);
    expect(resultado.usuario.roles).toEqual([Rol.CLIENTE]);
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: '11111111-1111-4111-8111-111111111111',
        rolActivo: Rol.CLIENTE,
      }),
    );
    expect(usuarioRepo.update).not.toHaveBeenCalled();
  });

  it('bloquea la cuenta al quinto intento fallido', async () => {
    const hash = await bcrypt.hash('Password123', 4);
    usuarioRepo.findOne.mockResolvedValue(
      crearUsuario({ passwordHash: hash, intentosFallidos: 4 }),
    );
    const dto: LoginDto = {
      telefono: '+59170000001',
      password: 'Incorrecta123',
    };
    const error = await capturarError(service.login(dto));
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(usuarioRepo.update).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      {
        intentosFallidos: 5,
        bloqueadoHasta: expect.any(Date),
      },
    );
  });

  it('rechaza login mientras el bloqueo temporal está activo', async () => {
    usuarioRepo.findOne.mockResolvedValue(
      crearUsuario({
        intentosFallidos: 5,
        bloqueadoHasta: new Date(Date.now() + 5 * 60 * 1000),
      }),
    );
    const dto: LoginDto = {
      telefono: '+59170000001',
      password: 'Password123',
    };
    const error = await capturarError(service.login(dto));
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  });

  it('permite login cuando el bloqueo expiró y reinicia intentos', async () => {
    const hash = await bcrypt.hash('Password123', 4);
    usuarioRepo.findOne.mockResolvedValue(
      crearUsuario({
        passwordHash: hash,
        intentosFallidos: 5,
        bloqueadoHasta: new Date(Date.now() - 1000),
      }),
    );
    const dto: LoginDto = {
      telefono: '+59170000001',
      password: 'Password123',
    };
    const resultado = await service.login(dto);
    expect(resultado.rol_activo).toBe(Rol.CLIENTE);
    expect(usuarioRepo.update).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      {
        intentosFallidos: 0,
        bloqueadoHasta: null,
      },
    );
  });

  it('rechaza login de una cuenta bloqueada por administrador', async () => {
    usuarioRepo.findOne.mockResolvedValue(
      crearUsuario({ estado: EstadoUsuario.BLOQUEADO }),
    );
    const dto: LoginDto = {
      telefono: '+59170000001',
      password: 'Password123',
    };
    await expect(service.login(dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('no emite token para un rol no habilitado', async () => {
    await expect(
      service.emitirToken(crearUsuario(), Rol.TRABAJADOR),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
