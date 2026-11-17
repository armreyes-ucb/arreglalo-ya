import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DecisionReclamo } from '../common/enums/decision-reclamo.enum.js';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoReclamo } from '../common/enums/estado-reclamo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import type { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { CONFIGURACION_POR_DEFECTO } from '../configuracion/configuracion.constants.js';
import type { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { ReclamosService } from './reclamos.service.js';
import type { SuspensionesService } from './suspensiones.service.js';

const CLIENTE_ID = '11111111-1111-4111-8111-111111111111';
const TRABAJADOR_USUARIO_ID = '22222222-2222-4222-8222-222222222222';
const PERFIL_ID = '33333333-3333-4333-8333-333333333333';
const SOLICITUD_ID = '44444444-4444-4444-8444-444444444444';
const RECLAMO_ID = '55555555-5555-4555-8555-555555555555';
const SUPERVISOR_ID = '66666666-6666-4666-8666-666666666666';

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
    estado: EstadoSolicitud.FINALIZADA,
    creadaEn: new Date('2026-05-20T10:00:00.000Z'),
    venceEn: new Date('2026-06-20T10:00:00.000Z'),
    entroAlTope: null,
    cerradaEn: new Date(Date.now() - 24 * 3_600_000),
    ...overrides,
  } as Solicitud;
}

function crearReclamo(
  overrides: Partial<Reclamo> = {},
): Reclamo {
  return {
    id: RECLAMO_ID,
    solicitudId: SOLICITUD_ID,
    motivo: 'El trabajo quedó incompleto',
    evidenciaFotos: [],
    respuestaTrabajador: null,
    estado: EstadoReclamo.ABIERTO,
    resolucionSupervisor: null,
    fechaApertura: new Date(),
    ...overrides,
  };
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
  };
}

function crearManager(
  buscar: (entidad: unknown) => unknown,
): {
  manager: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
} {
  const manager = {
    findOne: vi.fn(async (entidad: unknown) => buscar(entidad)),
    create: vi.fn((entidad: unknown, datos: object) => ({
      id: entidad === Reclamo ? RECLAMO_ID : 'generado',
      fechaApertura: new Date(),
      ...datos,
    })),
    save: vi.fn(async (_entidad: unknown, valor: unknown) => valor),
  };
  return { manager };
}

function crearServicio(
  manager: unknown,
  repositorios: Map<unknown, unknown>,
  suspensiones: Partial<SuspensionesService> = {},
): ReclamosService {
  const dataSource = {
    transaction: vi.fn(
      async (callback: (manager: unknown) => unknown) =>
        callback(manager),
    ),
    getRepository: vi.fn(
      (entidad: unknown) => repositorios.get(entidad),
    ),
  } as unknown as DataSource;

  return new ReclamosService(
    dataSource,
    suspensiones as SuspensionesService,
    {
      get: () => ({ ...CONFIGURACION_POR_DEFECTO }),
    } as unknown as ConfiguracionService,
  );
}

describe('ReclamosService', () => {
  let solicitud: Solicitud;
  let repositorios: Map<unknown, unknown>;

  beforeEach(() => {
    solicitud = crearSolicitud();
    repositorios = new Map();
  });

  it('registra un reclamo dentro de los 7 días del cierre (RN07)', async () => {
    const { manager } = crearManager((entidad) =>
      entidad === Reclamo ? null : solicitud,
    );
    const servicio = crearServicio(manager, repositorios);

    const resultado = await servicio.crear(
      CLIENTE_ID,
      SOLICITUD_ID,
      {
        motivo: 'El trabajo quedó incompleto',
        evidencia_fotos: ['/uploads/foto.jpg'],
      },
    );

    expect(manager.save).toHaveBeenCalledWith(
      Reclamo,
      expect.objectContaining({
        solicitudId: SOLICITUD_ID,
        estado: EstadoReclamo.ABIERTO,
        evidenciaFotos: ['/uploads/foto.jpg'],
      }),
    );
    expect(resultado.estado).toBe(EstadoReclamo.ABIERTO);
  });

  it('rechaza reclamos pasados los 7 días (RN07)', async () => {
    solicitud = crearSolicitud({
      cerradaEn: new Date(Date.now() - 8 * 24 * 3_600_000),
    });
    const { manager } = crearManager(() => solicitud);
    const servicio = crearServicio(manager, repositorios);

    await expect(
      servicio.crear(CLIENTE_ID, SOLICITUD_ID, {
        motivo: 'Reclamo tardío del trabajo',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza reclamar un trabajo que no está finalizado', async () => {
    solicitud = crearSolicitud({
      estado: EstadoSolicitud.CANCELADA,
    });
    const { manager } = crearManager(() => solicitud);
    const servicio = crearServicio(manager, repositorios);

    await expect(
      servicio.crear(CLIENTE_ID, SOLICITUD_ID, {
        motivo: 'El trabajo quedó incompleto',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza un segundo reclamo abierto del mismo trabajo', async () => {
    const { manager } = crearManager((entidad) =>
      entidad === Reclamo ? crearReclamo() : solicitud,
    );
    const servicio = crearServicio(manager, repositorios);

    await expect(
      servicio.crear(CLIENTE_ID, SOLICITUD_ID, {
        motivo: 'Otro reclamo del mismo trabajo',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza reclamar una solicitud ajena', async () => {
    const { manager } = crearManager(() => solicitud);
    const servicio = crearServicio(manager, repositorios);

    await expect(
      servicio.crear('otro-cliente', SOLICITUD_ID, {
        motivo: 'No es mi trabajo',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('registra la respuesta del trabajador dentro de las 48 horas', async () => {
    const reclamo = crearReclamo();
    const { manager } = crearManager((entidad) => {
      if (entidad === Reclamo) {
        return reclamo;
      }
      if (entidad === Solicitud) {
        return solicitud;
      }
      return crearPerfil();
    });
    const servicio = crearServicio(manager, repositorios);

    const resultado = await servicio.responder(
      TRABAJADOR_USUARIO_ID,
      RECLAMO_ID,
      { respuesta: 'El trabajo estaba terminado' },
    );

    expect(resultado.estado).toBe(EstadoReclamo.RESPONDIDO);
    expect(resultado.respuesta_trabajador).toBe(
      'El trabajo estaba terminado',
    );
  });

  it('rechaza la respuesta después de 48 horas (RF30)', async () => {
    const reclamo = crearReclamo({
      fechaApertura: new Date(Date.now() - 49 * 3_600_000),
    });
    const { manager } = crearManager((entidad) => {
      if (entidad === Reclamo) {
        return reclamo;
      }
      if (entidad === Solicitud) {
        return solicitud;
      }
      return crearPerfil();
    });
    const servicio = crearServicio(manager, repositorios);

    await expect(
      servicio.responder(TRABAJADOR_USUARIO_ID, RECLAMO_ID, {
        respuesta: 'Respuesta tardía',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza la respuesta de un trabajador ajeno al trabajo', async () => {
    const reclamo = crearReclamo();
    const { manager } = crearManager((entidad) => {
      if (entidad === Reclamo) {
        return reclamo;
      }
      if (entidad === Solicitud) {
        return solicitud;
      }
      return crearPerfil({
        id: 'otro-perfil',
        usuarioId: 'otro-usuario',
      });
    });
    const servicio = crearServicio(manager, repositorios);

    await expect(
      servicio.responder('otro-usuario', RECLAMO_ID, {
        respuesta: 'No participé',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('aplica la suspensión de Fibonacci al comprobar la falta (RF31)', async () => {
    const reclamo = crearReclamo();
    const aplicarFalta = vi.fn(async () => ({
      id: 'suspension-1',
      trabajadorId: PERFIL_ID,
      numeroFalta: 1,
      diasFibonacci: 1,
      motivo: 'Reclamo',
      inicio: new Date(),
      fin: new Date(Date.now() + 24 * 3_600_000),
    }));
    const { manager } = crearManager((entidad) =>
      entidad === Reclamo ? reclamo : solicitud,
    );
    const servicio = crearServicio(
      manager,
      repositorios,
      { aplicarFalta } as unknown as Partial<SuspensionesService>,
    );

    const resultado = await servicio.resolver(
      SUPERVISOR_ID,
      RECLAMO_ID,
      {
        decision: DecisionReclamo.FALTA_TRABAJADOR,
        resolucion: 'Se comprobó la falta',
      },
    );

    expect(aplicarFalta).toHaveBeenCalledWith(
      manager,
      PERFIL_ID,
      expect.stringContaining('Reclamo'),
      SUPERVISOR_ID,
    );
    expect(resultado.reclamo.estado).toBe(
      EstadoReclamo.FALTA_TRABAJADOR,
    );
    expect(resultado.suspension?.dias_fibonacci).toBe(1);
  });

  it('rechaza el reclamo sin aplicar suspensión', async () => {
    const reclamo = crearReclamo();
    const aplicarFalta = vi.fn();
    const { manager } = crearManager((entidad) =>
      entidad === Reclamo ? reclamo : solicitud,
    );
    const servicio = crearServicio(
      manager,
      repositorios,
      { aplicarFalta } as unknown as Partial<SuspensionesService>,
    );

    const resultado = await servicio.resolver(
      SUPERVISOR_ID,
      RECLAMO_ID,
      {
        decision: DecisionReclamo.RECHAZADO,
        resolucion: 'No se comprobó la falta',
      },
    );

    expect(aplicarFalta).not.toHaveBeenCalled();
    expect(resultado.reclamo.estado).toBe(
      EstadoReclamo.RECHAZADO,
    );
    expect(resultado.suspension).toBeNull();
  });

  it('no permite resolver dos veces el mismo reclamo', async () => {
    const reclamo = crearReclamo({
      estado: EstadoReclamo.RESUELTO,
    });
    const { manager } = crearManager((entidad) =>
      entidad === Reclamo ? reclamo : solicitud,
    );
    const servicio = crearServicio(
      manager,
      repositorios,
      { aplicarFalta: vi.fn() } as unknown as Partial<SuspensionesService>,
    );

    await expect(
      servicio.resolver(SUPERVISOR_ID, RECLAMO_ID, {
        decision: DecisionReclamo.RECHAZADO,
        resolucion: 'Ya resuelto',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devuelve los reclamos del cliente autenticado', async () => {
    repositorios.set(Solicitud, {
      find: vi.fn(async () => [{ id: SOLICITUD_ID }]),
    });
    repositorios.set(Reclamo, {
      find: vi.fn(async () => [crearReclamo()]),
    });
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorios,
    );

    const resultado = await servicio.mios(CLIENTE_ID);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe(RECLAMO_ID);
  });

  it('devuelve lista vacía si el cliente no tiene solicitudes', async () => {
    repositorios.set(Solicitud, {
      find: vi.fn(async () => []),
    });
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorios,
    );

    await expect(servicio.mios(CLIENTE_ID)).resolves.toEqual([]);
  });

  it('RF30: pasa a revisión del supervisor los reclamos sin respuesta en 48 horas', async () => {
    const update = vi.fn(async () => ({ affected: 2 }));
    repositorios.set(Reclamo, { update });
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorios,
    );

    const movidos = await servicio.pasarARevisionSupervisor(
      new Date('2026-05-10T12:00:00.000Z'),
    );

    expect(movidos).toBe(2);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: EstadoReclamo.ABIERTO,
      }),
      { estado: EstadoReclamo.EN_REVISION_SUPERVISOR },
    );
  });

  it('RF30: el cron de SLA no rompe si la actualización falla', async () => {
    repositorios.set(Reclamo, {
      update: vi.fn(async () => {
        throw new Error('base caída');
      }),
    });
    const servicio = crearServicio(
      crearManager(() => null).manager,
      repositorios,
    );

    await expect(
      servicio.procesarSlaProgramado(),
    ).resolves.toBeUndefined();
  });
});
