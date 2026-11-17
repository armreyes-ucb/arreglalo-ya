import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { hoyISO } from '../common/utils/fechas.js';
import { Calificacion } from '../entities/calificacion.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { CalificacionesService } from './calificaciones.service.js';

const CLIENTE_ID = '11111111-1111-4111-8111-111111111111';
const TRABAJADOR_USUARIO_ID = '22222222-2222-4222-8222-222222222222';
const PERFIL_ID = '33333333-3333-4333-8333-333333333333';
const SOLICITUD_ID = '44444444-4444-4444-8444-444444444444';

function crearSolicitud(
  overrides: Partial<Solicitud> = {},
): Solicitud {
  return {
    id: SOLICITUD_ID,
    clienteId: CLIENTE_ID,
    trabajadorConfirmadoId: PERFIL_ID,
    zonaId: 1,
    especialidad: EspecialidadTipo.PLOMERIA,
    tipoProblema: 'Fuga',
    descripcion: 'Fuga en el baño',
    fotosUrls: [],
    direccionOculta: 'Calle 1',
    fechaCitaPreferida: new Date('2026-06-01T10:00:00.000Z'),
    urgente: false,
    estado: EstadoSolicitud.CONFIRMADA,
    creadaEn: new Date('2026-05-30T10:00:00.000Z'),
    venceEn: new Date('2026-06-30T10:00:00.000Z'),
    entroAlTope: null,
    cerradaEn: null,
    ...overrides,
  } as Solicitud;
}

function crearPerfil(
  overrides: Partial<PerfilTrabajador> = {},
): PerfilTrabajador {
  return {
    id: PERFIL_ID,
    usuarioId: TRABAJADOR_USUARIO_ID,
    especialidades: [],
    horarios: null,
    preciosEstimados: {},
    nivelVerificacion: 2,
    promedio: 0,
    trabajosCompletados: 0,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.ACTIVO,
    fechaPausa: null,
    venceAntecedentes: null,
    ...overrides,
  } as PerfilTrabajador;
}

function crearManager(
  buscar: (entidad: unknown) => unknown,
): {
  manager: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  qb: { getRawMany: ReturnType<typeof vi.fn> };
} {
  const qb = {
    select: vi.fn(() => qb),
    addSelect: vi.fn(() => qb),
    where: vi.fn(() => qb),
    groupBy: vi.fn(() => qb),
    getRawMany: vi.fn(async () => [] as unknown[]),
  };
  const manager = {
    findOne: vi.fn(async (entidad: unknown) => buscar(entidad)),
    create: vi.fn((_entidad: unknown, datos: object) => ({
      id: 'calificacion-1',
      ...datos,
    })),
    save: vi.fn(async (_entidad: unknown, valor: unknown) => valor),
    update: vi.fn(async () => undefined),
    createQueryBuilder: vi.fn(() => qb),
  };
  return { manager, qb };
}

function crearServicio(
  manager: unknown,
  repositorioCalificaciones: unknown = {
    find: vi.fn(async () => []),
  },
  repositorioPerfiles: unknown = {
    findOne: vi.fn(async () => crearPerfil()),
  },
): CalificacionesService {
  const dataSource = {
    transaction: vi.fn(
      async (callback: (manager: unknown) => unknown) =>
        callback(manager),
    ),
    getRepository: vi.fn(() => repositorioCalificaciones),
  } as unknown as DataSource;

  return new CalificacionesService(
    dataSource,
    repositorioPerfiles as Repository<PerfilTrabajador>,
  );
}

describe('CalificacionesService', () => {
  let solicitud: Solicitud;
  let perfil: PerfilTrabajador;

  beforeEach(() => {
    solicitud = crearSolicitud();
    perfil = crearPerfil();
  });

  it('registra la calificación del cliente al trabajador y recalcula el promedio', async () => {
    const { manager } = crearManager((entidad) => {
      if (entidad === Solicitud) {
        return solicitud;
      }
      if (entidad === PerfilTrabajador) {
        return perfil;
      }
      return null;
    });
    const servicio = crearServicio(manager);
    const recalcular = vi
      .spyOn(servicio, 'recalcularPromedio')
      .mockResolvedValue(undefined);

    const resultado = await servicio.crear(
      CLIENTE_ID,
      Rol.CLIENTE,
      SOLICITUD_ID,
      {
        estrellas: 5,
        calidad: 5,
        comentario: 'Excelente trabajo',
      },
    );

    expect(manager.save).toHaveBeenCalledWith(
      Calificacion,
      expect.objectContaining({
        solicitudId: SOLICITUD_ID,
        autorId: CLIENTE_ID,
        destinatarioId: TRABAJADOR_USUARIO_ID,
        estrellas: 5,
        fecha: hoyISO(),
      }),
    );
    expect(resultado.destinatario_id).toBe(
      TRABAJADOR_USUARIO_ID,
    );
    expect(recalcular).toHaveBeenCalledWith(
      manager,
      TRABAJADOR_USUARIO_ID,
    );
  });

  it('permite al trabajador calificar al cliente sin recalcular su promedio', async () => {
    const { manager } = crearManager((entidad) => {
      if (entidad === Solicitud) {
        return solicitud;
      }
      if (entidad === PerfilTrabajador) {
        return perfil;
      }
      return null;
    });
    const servicio = crearServicio(manager);
    const recalcular = vi
      .spyOn(servicio, 'recalcularPromedio')
      .mockResolvedValue(undefined);

    const resultado = await servicio.crear(
      TRABAJADOR_USUARIO_ID,
      Rol.TRABAJADOR,
      SOLICITUD_ID,
      { estrellas: 4 },
    );

    expect(resultado.destinatario_id).toBe(CLIENTE_ID);
    expect(recalcular).not.toHaveBeenCalled();
  });

  it('CP15: rechaza una segunda calificación del mismo trabajo en el mismo día (RN12)', async () => {
    const { manager } = crearManager((entidad) => {
      if (entidad === Solicitud) {
        return solicitud;
      }
      if (entidad === PerfilTrabajador) {
        return perfil;
      }
      if (entidad === Calificacion) {
        return { id: 'existente' };
      }
      return null;
    });
    const servicio = crearServicio(manager);

    await expect(
      servicio.crear(CLIENTE_ID, Rol.CLIENTE, SOLICITUD_ID, {
      estrellas: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rechaza calificar una solicitud que todavía no fue confirmada', async () => {
    solicitud = crearSolicitud({
      estado: EstadoSolicitud.PENDIENTE_PAGO,
    });
    const { manager } = crearManager((entidad) =>
      entidad === Solicitud ? solicitud : null,
    );
    const servicio = crearServicio(manager);

    await expect(
      servicio.crear(CLIENTE_ID, Rol.CLIENTE, SOLICITUD_ID, {
      estrellas: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza calificar a quien no participa del trabajo', async () => {
    const { manager } = crearManager((entidad) => {
      if (entidad === Solicitud) {
        return solicitud;
      }
      if (entidad === PerfilTrabajador) {
        return crearPerfil({
          usuarioId: 'otro-trabajador',
        });
      }
      return null;
    });
    const servicio = crearServicio(manager);

    await expect(
      servicio.crear('otro-usuario', Rol.CLIENTE, SOLICITUD_ID, {
      estrellas: 3,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('guarda la respuesta pública del trabajador (RF29)', async () => {
    const { manager } = crearManager((entidad) =>
      entidad === Calificacion
        ? {
            id: 'calificacion-1',
            solicitudId: SOLICITUD_ID,
            autorId: CLIENTE_ID,
            destinatarioId: TRABAJADOR_USUARIO_ID,
            estrellas: 5,
            calidad: 5,
            puntualidad: 5,
            trato: 5,
            precioJusto: 5,
            comentario: 'Muy buen trabajo',
            respuestaTrabajador: null,
            fecha: hoyISO(),
          }
        : null,
    );
    const servicio = crearServicio(manager);

    const resultado = await servicio.responder(
      TRABAJADOR_USUARIO_ID,
      'calificacion-1',
      { respuesta: 'Gracias por la confianza' },
    );

    expect(resultado.respuesta_trabajador).toBe(
      'Gracias por la confianza',
    );
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza una segunda respuesta pública (RF29)', async () => {
    const { manager } = crearManager((entidad) =>
      entidad === Calificacion
        ? {
            id: 'calificacion-1',
            autorId: CLIENTE_ID,
            destinatarioId: TRABAJADOR_USUARIO_ID,
            comentario: 'Buen trabajo',
            respuestaTrabajador: 'Ya respondí',
            fecha: hoyISO(),
          }
        : null,
    );
    const servicio = crearServicio(manager);

    await expect(
      servicio.responder(TRABAJADOR_USUARIO_ID, 'calificacion-1', {
        respuesta: 'Otra respuesta',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza responder una calificación ajena (RF29)', async () => {
    const { manager } = crearManager((entidad) =>
      entidad === Calificacion
        ? {
            id: 'calificacion-1',
            autorId: CLIENTE_ID,
            destinatarioId: TRABAJADOR_USUARIO_ID,
            comentario: 'Buen trabajo',
            respuestaTrabajador: null,
            fecha: hoyISO(),
          }
        : null,
    );
    const servicio = crearServicio(manager);

    await expect(
      servicio.responder('otro-usuario', 'calificacion-1', {
        respuesta: 'No me corresponde',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('calcula el promedio contando cada trabajo como un solo voto (RN12)', async () => {
    const { manager, qb } = crearManager(() => null);
    qb.getRawMany.mockResolvedValue([
      { promedio: '4' },
      { promedio: '5' },
      { promedio: '3' },
    ]);
    const servicio = crearServicio(manager);

    await servicio.recalcularPromedio(
      manager as never,
      TRABAJADOR_USUARIO_ID,
    );

    expect(manager.update).toHaveBeenCalledWith(
      PerfilTrabajador,
      { usuarioId: TRABAJADOR_USUARIO_ID },
      { promedio: 4 },
    );
  });

  it('construye el resumen público de reputación del trabajador (RF28)', async () => {
    const repositorioCalificaciones = {
      find: vi.fn(async () => [
        {
          id: 'c1',
          solicitudId: 's1',
          autorId: CLIENTE_ID,
          destinatarioId: TRABAJADOR_USUARIO_ID,
          estrellas: 5,
          calidad: 4,
          puntualidad: 5,
          trato: 5,
          precioJusto: 4,
          comentario: 'Bien',
          respuestaTrabajador: null,
          fecha: '2026-05-01',
        },
        {
          id: 'c2',
          solicitudId: 's1',
          autorId: CLIENTE_ID,
          destinatarioId: TRABAJADOR_USUARIO_ID,
          estrellas: 3,
          calidad: 2,
          puntualidad: 3,
          trato: 3,
          precioJusto: 2,
          comentario: null,
          respuestaTrabajador: null,
          fecha: '2026-05-02',
        },
      ]),
    };
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorioCalificaciones,
      {
        findOne: vi.fn(async () =>
          crearPerfil({ promedio: 4 }),
        ),
      },
    );

    const resumen = await servicio.listarPorTrabajador(PERFIL_ID);

    expect(resumen.trabajador_id).toBe(PERFIL_ID);
    expect(resumen.total_trabajos).toBe(1);
    expect(resumen.total_calificaciones).toBe(2);
    expect(resumen.por_habilidad).toEqual({
      calidad: 3,
      puntualidad: 4,
      trato: 4,
      precio_justo: 3,
    });
  });

  it('rechaza el resumen de un trabajador inexistente', async () => {
    const servicio = crearServicio(crearManager(() => null).manager, {
      find: vi.fn(async () => []),
    }, {
      findOne: vi.fn(async () => null),
    });

    await expect(
      servicio.listarPorTrabajador(PERFIL_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('CP10: agrega el comentario sin límite de días sobre la calificación existente', async () => {
    const existente = {
      id: 'calificacion-vieja',
      solicitudId: SOLICITUD_ID,
      autorId: CLIENTE_ID,
      destinatarioId: TRABAJADOR_USUARIO_ID,
      estrellas: 4,
      calidad: null,
      puntualidad: null,
      trato: null,
      precioJusto: null,
      comentario: null,
      respuestaTrabajador: null,
      fecha: '2026-01-05',
    } as Calificacion;
    const { manager } = crearManager((entidad) => {
      if (entidad === Solicitud) {
        return crearSolicitud({
          estado: EstadoSolicitud.FINALIZADA,
        });
      }
      if (entidad === PerfilTrabajador) {
        return perfil;
      }
      if (entidad === Calificacion) {
        return existente;
      }
      return null;
    });
    const servicio = crearServicio(manager);

    const resultado = await servicio.comentar(
      CLIENTE_ID,
      Rol.CLIENTE,
      SOLICITUD_ID,
      { comentario: 'Comentario agregado semanas después' },
    );

    expect(manager.save).toHaveBeenCalledWith(
      Calificacion,
      expect.objectContaining({
        comentario: 'Comentario agregado semanas después',
      }),
    );
    expect(resultado.comentario).toBe(
      'Comentario agregado semanas después',
    );
    expect(resultado.estrellas).toBe(4);
    expect(manager.create).not.toHaveBeenCalled();
  });

  it('permite comentar con estrellas si el autor aún no calificó la solicitud', async () => {
    const { manager } = crearManager((entidad) => {
      if (entidad === Solicitud) {
        return solicitud;
      }
      if (entidad === PerfilTrabajador) {
        return perfil;
      }
      return null;
    });
    const servicio = crearServicio(manager);
    const recalcular = vi
      .spyOn(servicio, 'recalcularPromedio')
      .mockResolvedValue(undefined);

    const resultado = await servicio.comentar(
      CLIENTE_ID,
      Rol.CLIENTE,
      SOLICITUD_ID,
      { comentario: 'Muy buen trabajo', estrellas: 5 },
    );

    expect(resultado.estrellas).toBe(5);
    expect(recalcular).toHaveBeenCalledWith(
      manager,
      TRABAJADOR_USUARIO_ID,
    );
  });

  it('exige estrellas cuando todavía no existe calificación de la solicitud', async () => {
    const { manager } = crearManager((entidad) => {
      if (entidad === Solicitud) {
        return solicitud;
      }
      if (entidad === PerfilTrabajador) {
        return perfil;
      }
      return null;
    });
    const servicio = crearServicio(manager);

    await expect(
      servicio.comentar(CLIENTE_ID, Rol.CLIENTE, SOLICITUD_ID, {
        comentario: 'Solo quiero dejar un comentario',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.save).not.toHaveBeenCalled();
  });
});
