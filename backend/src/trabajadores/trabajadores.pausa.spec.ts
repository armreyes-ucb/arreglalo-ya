import { BadRequestException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccionPausa } from '../common/enums/accion-pausa.enum.js';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { CONFIGURACION_POR_DEFECTO } from '../configuracion/configuracion.constants.js';
import type { ConfiguracionService } from '../configuracion/configuracion.service.js';
import {
  diferenciaDias,
  hoyISO,
  sumarDias,
} from '../common/utils/fechas.js';
import type { Oferta } from '../entities/oferta.entity.js';
import type { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import type { Solicitud } from '../entities/solicitud.entity.js';
import type { Usuario } from '../entities/usuario.entity.js';
import { TrabajadoresService } from './trabajadores.service.js';

const USUARIO_ID = '11111111-1111-4111-8111-111111111111';
const PERFIL_ID = '22222222-2222-4222-8222-222222222222';

function crearUsuario(
  overrides: Partial<Usuario> = {},
): Usuario {
  return {
    id: USUARIO_ID,
    nombreCompleto: 'Trabajador Prueba',
    telefono: '+59170000002',
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
    especialidades: [EspecialidadTipo.PLOMERIA],
    horarios: 'Lun a Vie 08:00-18:00',
    preciosEstimados: { PLOMERIA: 100 },
    nivelVerificacion: 3,
    promedio: 4.5,
    trabajosCompletados: 10,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.ACTIVO,
    fechaPausa: null,
    venceAntecedentes: '2027-01-01',
    usuario: crearUsuario(),
    ...overrides,
  };
}

function crearServicio(perfil: PerfilTrabajador) {
  const perfilRepository = {
    find: vi.fn(async () => [] as PerfilTrabajador[]),
    findOne: vi.fn(async () => perfil as PerfilTrabajador | null),
    save: vi.fn(async (valor: PerfilTrabajador) => valor),
  };
  const zonaRepository = { findOne: vi.fn(), find: vi.fn() };
  const trabajadorZonaRepository = {
    find: vi.fn(async () => []),
  };
  const documentoRepository = {
    find: vi.fn(async () => []),
  };
  const suspensionRepository = { findOne: vi.fn() };
  const solicitudRepository = {
    find: vi.fn(async () => [] as Partial<Solicitud>[]),
  };
  const ofertaRepository = {
    find: vi.fn(async () => [] as Partial<Oferta>[]),
  };
  const usuarioRepository = {
    findOne: vi.fn(async () => crearUsuario() as Usuario | null),
    update: vi.fn(async () => undefined),
  };

  const service = new TrabajadoresService(
    perfilRepository as never,
    zonaRepository as never,
    trabajadorZonaRepository as never,
    documentoRepository as never,
    suspensionRepository as never,
    {} as DataSource,
    solicitudRepository as never,
    ofertaRepository as never,
    usuarioRepository as never,
    {
      get: () => ({ ...CONFIGURACION_POR_DEFECTO }),
    } as unknown as ConfiguracionService,
  );

  return {
    service,
    perfilRepository,
    solicitudRepository,
    ofertaRepository,
    usuarioRepository,
  };
}

describe('TrabajadoresService - RF05 pausa', () => {
  let perfil: PerfilTrabajador;

  beforeEach(() => {
    perfil = crearPerfil();
  });

  it('pausa la cuenta y devuelve el vencimiento a 30 días', async () => {
    const { service, perfilRepository } = crearServicio(perfil);

    const resultado = await service.cambiarPausa(USUARIO_ID, {
      accion: AccionPausa.PAUSAR,
    });

    expect(perfil.estado).toBe(EstadoTrabajador.PAUSADO);
    expect(perfil.fechaPausa).toBeInstanceOf(Date);
    expect(perfilRepository.save).toHaveBeenCalledWith(perfil);
    expect(resultado.estado).toBe(EstadoTrabajador.PAUSADO);
    expect(resultado.pausa.pausado).toBe(true);
    expect(resultado.pausa.inicio).toBe(hoyISO(perfil.fechaPausa!));
    expect(resultado.pausa.vence_en).toBe(
      hoyISO(sumarDias(perfil.fechaPausa!, 30)),
    );
    expect(resultado.pausa.baja_en).toBe(
      hoyISO(sumarDias(perfil.fechaPausa!, 60)),
    );
    expect(resultado.pausa.dias_restantes).toBeGreaterThan(0);
    expect(resultado.pausa.estado).toBe('ACTIVA');
  });

  it('rechaza la pausa con trabajos en curso', async () => {
    const { service, solicitudRepository } = crearServicio(perfil);
    solicitudRepository.find.mockResolvedValueOnce([{ id: 's1' }]);

    await expect(
      service.cambiarPausa(USUARIO_ID, {
        accion: AccionPausa.PAUSAR,
      }),
    ).rejects.toThrow('trabajo(s) en curso');
    expect(perfil.estado).toBe(EstadoTrabajador.ACTIVO);
    expect(perfil.fechaPausa).toBeNull();
  });

  it('rechaza la pausa con una oferta elegida pendiente de pago', async () => {
    const { service, solicitudRepository, ofertaRepository } =
      crearServicio(perfil);
    solicitudRepository.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 's2' }]);
    ofertaRepository.find.mockResolvedValueOnce([
      { solicitudId: 's2' },
    ]);

    await expect(
      service.cambiarPausa(USUARIO_ID, {
        accion: AccionPausa.PAUSAR,
      }),
    ).rejects.toThrow('pendiente de pago');
    expect(perfil.estado).toBe(EstadoTrabajador.ACTIVO);
  });

  it('permite pausar si la oferta elegida ya no está pendiente de pago', async () => {
    const { service, solicitudRepository, ofertaRepository } =
      crearServicio(perfil);
    solicitudRepository.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    ofertaRepository.find.mockResolvedValueOnce([
      { solicitudId: 's2' },
    ]);

    const resultado = await service.cambiarPausa(USUARIO_ID, {
      accion: AccionPausa.PAUSAR,
    });

    expect(resultado.estado).toBe(EstadoTrabajador.PAUSADO);
  });

  it('rechaza la pausa de una cuenta suspendida', async () => {
    perfil = crearPerfil({ estado: EstadoTrabajador.SUSPENDIDO });
    const { service } = crearServicio(perfil);

    await expect(
      service.cambiarPausa(USUARIO_ID, {
        accion: AccionPausa.PAUSAR,
      }),
    ).rejects.toThrow('suspendida');
  });

  it('rechaza la pausa de una cuenta dada de baja', async () => {
    perfil = crearPerfil({ estado: EstadoTrabajador.BAJA });
    const { service } = crearServicio(perfil);

    await expect(
      service.cambiarPausa(USUARIO_ID, {
        accion: AccionPausa.PAUSAR,
      }),
    ).rejects.toThrow('dado de baja');
  });

  it('rechaza la pausa de un trabajador aún no verificado', async () => {
    perfil = crearPerfil({ estado: EstadoTrabajador.PENDIENTE });
    const { service } = crearServicio(perfil);

    await expect(
      service.cambiarPausa(USUARIO_ID, {
        accion: AccionPausa.PAUSAR,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza pausar dos veces la misma cuenta', async () => {
    perfil = crearPerfil({
      estado: EstadoTrabajador.PAUSADO,
      fechaPausa: new Date(),
    });
    const { service } = crearServicio(perfil);

    await expect(
      service.cambiarPausa(USUARIO_ID, {
        accion: AccionPausa.PAUSAR,
      }),
    ).rejects.toThrow('ya está en pausa');
  });

  it('reactiva la cuenta y limpia la fecha de pausa', async () => {
    perfil = crearPerfil({
      estado: EstadoTrabajador.PAUSADO,
      fechaPausa: new Date(),
    });
    const { service } = crearServicio(perfil);

    const resultado = await service.cambiarPausa(USUARIO_ID, {
      accion: AccionPausa.REACTIVAR,
    });

    expect(perfil.estado).toBe(EstadoTrabajador.ACTIVO);
    expect(perfil.fechaPausa).toBeNull();
    expect(resultado.estado).toBe(EstadoTrabajador.ACTIVO);
    expect(resultado.pausa.pausado).toBe(false);
  });

  it('rechaza reactivar una cuenta que no está en pausa', async () => {
    const { service } = crearServicio(perfil);

    await expect(
      service.cambiarPausa(USUARIO_ID, {
        accion: AccionPausa.REACTIVAR,
      }),
    ).rejects.toThrow('no está en pausa');
  });

  it('rechaza reactivar una cuenta dada de baja', async () => {
    perfil = crearPerfil({ estado: EstadoTrabajador.BAJA });
    const { service } = crearServicio(perfil);

    await expect(
      service.cambiarPausa(USUARIO_ID, {
        accion: AccionPausa.REACTIVAR,
      }),
    ).rejects.toThrow('dado de baja');
  });

  it('avisa cuando faltan 5 días para vencer la pausa', async () => {
    const hoy = new Date(`${hoyISO()}T12:00:00.000Z`);
    perfil = crearPerfil({
      estado: EstadoTrabajador.PAUSADO,
      fechaPausa: sumarDias(hoy, -26),
    });
    const { service } = crearServicio(perfil);

    const resultado = await service.obtenerPerfilPropio(USUARIO_ID);

    expect(resultado.pausa.estado).toBe('ACTIVA');
    expect(resultado.pausa.dias_restantes).toBe(
      diferenciaDias(
        hoyISO(sumarDias(perfil.fechaPausa!, 30)),
        hoyISO(),
      ),
    );
    expect(resultado.pausa.aviso).toBe(true);
  });

  it('marca la pausa como vencida a los 31 días', async () => {
    const hoy = new Date(`${hoyISO()}T12:00:00.000Z`);
    perfil = crearPerfil({
      estado: EstadoTrabajador.PAUSADO,
      fechaPausa: sumarDias(hoy, -31),
    });
    const { service } = crearServicio(perfil);

    const resultado = await service.obtenerPerfilPropio(USUARIO_ID);

    expect(resultado.pausa.estado).toBe('VENCIDA');
    expect(resultado.pausa.dias_restantes).toBe(0);
    expect(resultado.pausa.aviso).toBe(false);
  });

  it('CP12: a los 30 días de pausa y 31 sin reactivar da de baja el rol y conserva CLIENTE', async () => {
    const hoy = new Date(`${hoyISO()}T12:00:00.000Z`);
    perfil = crearPerfil({
      estado: EstadoTrabajador.PAUSADO,
      fechaPausa: sumarDias(hoy, -60),
    });
    const { service, perfilRepository, usuarioRepository } =
      crearServicio(perfil);
    perfilRepository.find.mockResolvedValueOnce([perfil]);

    const dadosDeBaja = await service.procesarPausasVencidas(
      sumarDias(perfil.fechaPausa!, 61),
    );

    expect(dadosDeBaja).toBe(1);
    expect(perfil.estado).toBe(EstadoTrabajador.BAJA);
    expect(usuarioRepository.update).toHaveBeenCalledWith(
      USUARIO_ID,
      { roles: [Rol.CLIENTE] },
    );
  });

  it('no da de baja una pausa antes de los 60 días', async () => {
    const hoy = new Date(`${hoyISO()}T12:00:00.000Z`);
    perfil = crearPerfil({
      estado: EstadoTrabajador.PAUSADO,
      fechaPausa: sumarDias(hoy, -45),
    });
    const { service, perfilRepository, usuarioRepository } =
      crearServicio(perfil);
    perfilRepository.find.mockResolvedValueOnce([perfil]);

    const dadosDeBaja = await service.procesarPausasVencidas();

    expect(dadosDeBaja).toBe(0);
    expect(perfil.estado).toBe(EstadoTrabajador.PAUSADO);
    expect(usuarioRepository.update).not.toHaveBeenCalled();
  });

  it('no procesa perfiles sin fecha de pausa', async () => {
    perfil = crearPerfil({
      estado: EstadoTrabajador.PAUSADO,
      fechaPausa: null,
    });
    const { service, perfilRepository } = crearServicio(perfil);
    perfilRepository.find.mockResolvedValueOnce([perfil]);

    await expect(service.procesarPausasVencidas()).resolves.toBe(0);
    expect(perfil.estado).toBe(EstadoTrabajador.PAUSADO);
  });
});
