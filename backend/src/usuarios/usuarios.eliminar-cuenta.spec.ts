import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoReclamo } from '../common/enums/estado-reclamo.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { Documento } from '../entities/documento.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import { UsuariosService } from './usuarios.service.js';

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

const USUARIO_ID = '11111111-1111-4111-8111-111111111111';
const PERFIL_ID = '22222222-2222-4222-8222-222222222222';

function crearUsuario(
  overrides: Partial<Usuario> = {},
): Usuario {
  return {
    id: USUARIO_ID,
    nombreCompleto: 'Usuario Prueba',
    telefono: '+59170000001',
    passwordHash: 'hash',
    roles: [Rol.CLIENTE, Rol.TRABAJADOR],
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
    especialidades: [],
    horarios: 'Lun a Vie',
    preciosEstimados: { PLOMERIA: 100 },
    nivelVerificacion: 3,
    promedio: 4.5,
    trabajosCompletados: 10,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.ACTIVO,
    fechaPausa: null,
    venceAntecedentes: '2027-01-01',
    ...overrides,
  };
}

interface Escenario {
  usuario?: Usuario | null;
  perfil?: PerfilTrabajador | null;
  solicitudes?: unknown[][];
  pagos?: unknown[];
  devoluciones?: unknown[];
  reclamos?: unknown[];
  documentos?: unknown[];
}

function crearServicio(escenario: Escenario = {}) {
  const usuario =
    escenario.usuario === undefined
      ? crearUsuario()
      : escenario.usuario;
  const perfil =
    escenario.perfil === undefined
      ? crearPerfil()
      : escenario.perfil;
  const solicitudes = [...(escenario.solicitudes ?? [])];
  const pagos = escenario.pagos ?? [];
  const devoluciones = escenario.devoluciones ?? [];
  const reclamos = escenario.reclamos ?? [];
  const documentos = escenario.documentos ?? [];

  const usuarioRepo = {
    findOne: vi.fn(async () => usuario),
  };
  const perfilRepo = { findOne: vi.fn(async () => perfil) };
  const zonaRepo = { findBy: vi.fn() };

  const manager = {
    findOne: vi.fn(async () => perfil),
    find: vi.fn(async (entidad: unknown) => {
      if (entidad === Solicitud) {
        return solicitudes.length > 0
          ? solicitudes.shift()
          : [];
      }
      if (entidad === Pago) {
        return pagos;
      }
      if (entidad === Devolucion) {
        return devoluciones;
      }
      if (entidad === Reclamo) {
        return reclamos;
      }
      if (entidad === Documento) {
        return documentos;
      }
      return [];
    }),
    save: vi.fn(async (_entidad: unknown, valor: unknown) => valor),
    update: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  };

  const dataSource = {
    transaction: vi.fn(
      async (callback: (managerFalso: typeof manager) => unknown) =>
        callback(manager),
    ),
  };
  const authService = { emitirToken: vi.fn() };
  const documentStorage = {
    eliminar: vi.fn(async () => true),
  };

  const service = new UsuariosService(
    usuarioRepo as never,
    perfilRepo as never,
    zonaRepo as never,
    dataSource as unknown as DataSource,
    authService as never,
    documentStorage as never,
  );

  return {
    service,
    usuario,
    perfil,
    manager,
    dataSource,
    documentStorage,
  };
}

describe('UsuariosService - RF06 borrado de cuenta', () => {
  beforeEach(() => {
    vi.mocked(bcrypt.compare).mockResolvedValue(true);
  });

  it('rechaza el borrado con contraseña incorrecta', async () => {
    vi.mocked(bcrypt.compare).mockResolvedValue(false);
    const { service, dataSource } = crearServicio();

    await expect(
      service.eliminarCuenta(USUARIO_ID, { password: 'mala' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rechaza el borrado de una cuenta inexistente', async () => {
    const { service } = crearServicio({ usuario: null });

    await expect(
      service.eliminarCuenta(USUARIO_ID, { password: 'clave' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('responde sin cambios si la cuenta ya fue anonimizada', async () => {
    const { service, dataSource } = crearServicio({
      usuario: crearUsuario({
        estado: EstadoUsuario.ANONIMIZADO,
      }),
    });

    const resultado = await service.eliminarCuenta(USUARIO_ID, {
      password: 'clave',
    });

    expect(resultado).toEqual({
      anonimizado: true,
      ya_anonimizado: true,
    });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rechaza el borrado con una solicitud activa como cliente (CP22)', async () => {
    const { service, manager } = crearServicio({
      solicitudes: [[{ id: 's1' }]],
    });

    await expect(
      service.eliminarCuenta(USUARIO_ID, { password: 'clave' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rechaza el borrado con una solicitud activa como trabajador (CP22)', async () => {
    const { service } = crearServicio({
      solicitudes: [[], [{ id: 's2' }]],
    });

    await expect(
      service.eliminarCuenta(USUARIO_ID, { password: 'clave' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza el borrado con un pago pendiente (CP22)', async () => {
    const { service } = crearServicio({
      solicitudes: [[], [], [{ id: 's1' }]],
      pagos: [
        { id: 'p1', estadoQr: EstadoQr.PENDIENTE, transferidoAlTrabajador: false },
      ],
    });

    await expect(
      service.eliminarCuenta(USUARIO_ID, { password: 'clave' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza el borrado con un pago sin transferir (CP22)', async () => {
    const { service } = crearServicio({
      solicitudes: [[], [], [{ id: 's1' }]],
      pagos: [
        { id: 'p1', estadoQr: EstadoQr.PAGADO, transferidoAlTrabajador: false },
      ],
    });

    await expect(
      service.eliminarCuenta(USUARIO_ID, { password: 'clave' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza el borrado con una devolución en curso (CP22)', async () => {
    const { service } = crearServicio({
      solicitudes: [[], [], [{ id: 's1' }]],
      pagos: [
        { id: 'p1', estadoQr: EstadoQr.PAGADO, transferidoAlTrabajador: true },
      ],
      devoluciones: [
        { id: 'd1', estado: EstadoDevolucion.PENDIENTE },
      ],
    });

    await expect(
      service.eliminarCuenta(USUARIO_ID, { password: 'clave' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza el borrado con un reclamo abierto (CP22)', async () => {
    const { service } = crearServicio({
      solicitudes: [[], [], [{ id: 's1' }]],
      pagos: [
        { id: 'p1', estadoQr: EstadoQr.PAGADO, transferidoAlTrabajador: true },
      ],
      reclamos: [
        { id: 'r1', estado: EstadoReclamo.RESPONDIDO },
      ],
    });

    await expect(
      service.eliminarCuenta(USUARIO_ID, { password: 'clave' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('anonimiza la cuenta y conserva los registros históricos', async () => {
    const { service, manager, perfil, documentStorage } = crearServicio({
      solicitudes: [
        [],
        [],
        [{ id: 's1' }, { id: 's2' }],
      ],
      pagos: [
        { id: 'p1', estadoQr: EstadoQr.DEVUELTO, transferidoAlTrabajador: false },
      ],
      documentos: [
        { archivoPrivadoUrl: 'private://documentos/uno.pdf' },
        { archivoPrivadoUrl: 'private://documentos/dos.jpg' },
      ],
    });

    const resultado = await service.eliminarCuenta(USUARIO_ID, {
      password: 'clave',
    });

    expect(resultado).toEqual({
      anonimizado: true,
      ya_anonimizado: false,
    });
    expect(manager.update).toHaveBeenCalledWith(Usuario, USUARIO_ID, {
      nombreCompleto: 'Usuario anónimo',
      telefono: 'ANON-111111111111',
      passwordHash: 'ANONIMIZADO',
      estado: EstadoUsuario.ANONIMIZADO,
      intentosFallidos: 0,
      bloqueadoHasta: null,
    });
    expect(perfil.estado).toBe(EstadoTrabajador.BAJA);
    expect(perfil.fechaPausa).toBeNull();
    expect(perfil.horarios).toBeNull();
    expect(perfil.preciosEstimados).toEqual({});
    expect(manager.save).toHaveBeenCalledWith(
      PerfilTrabajador,
      perfil,
    );
    expect(manager.delete).toHaveBeenCalledWith(TrabajadorZona, {
      trabajadorId: PERFIL_ID,
    });
    expect(manager.delete).toHaveBeenCalledWith(Documento, {
      trabajadorId: PERFIL_ID,
    });
    expect(manager.delete).toHaveBeenCalledWith(CuentaBancaria, {
      usuarioId: USUARIO_ID,
    });
    expect(documentStorage.eliminar).toHaveBeenCalledTimes(2);
    expect(documentStorage.eliminar).toHaveBeenCalledWith(
      'private://documentos/uno.pdf',
    );
  });

  it('anonimiza aunque un archivo privado ya no exista', async () => {
    const { service, documentStorage } = crearServicio({
      solicitudes: [[], [], []],
      documentos: [
        { archivoPrivadoUrl: 'private://documentos/borrado.pdf' },
      ],
    });
    documentStorage.eliminar.mockResolvedValue(false);

    await expect(
      service.eliminarCuenta(USUARIO_ID, { password: 'clave' }),
    ).resolves.toEqual({
      anonimizado: true,
      ya_anonimizado: false,
    });
  });

  it('anonimiza a un cliente sin perfil de trabajador', async () => {
    const { service, manager } = crearServicio({
      perfil: null,
      solicitudes: [[], [{ id: 's1' }]],
      pagos: [
        { id: 'p1', estadoQr: EstadoQr.PAGADO, transferidoAlTrabajador: true },
      ],
    });

    const resultado = await service.eliminarCuenta(USUARIO_ID, {
      password: 'clave',
    });

    expect(resultado.anonimizado).toBe(true);
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.delete).toHaveBeenCalledTimes(1);
    expect(manager.delete).toHaveBeenCalledWith(CuentaBancaria, {
      usuarioId: USUARIO_ID,
    });
  });
});
