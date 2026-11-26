import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstadoAlerta } from '../common/enums/estado-alerta.enum.js';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import type { AlertaSolicitud } from '../entities/alerta-solicitud.entity.js';
import type { ConfiguracionAlerta } from '../entities/configuracion-alerta.entity.js';
import type { Solicitud } from '../entities/solicitud.entity.js';
import type { Zona } from '../entities/zona.entity.js';
import { AlertasService } from './alertas.service.js';

const AHORA = new Date();
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

const CLIENTE_ID = '11111111-1111-4111-8111-111111111111';
const SUPERVISOR_ID = '66666666-6666-4666-8666-666666666666';

function crearSolicitud(overrides: Partial<Solicitud> = {}): Solicitud {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    clienteId: CLIENTE_ID,
    trabajadorConfirmadoId: null,
    zonaId: 1,
    especialidad: EspecialidadTipo.PLOMERIA,
    tipoProblema: 'Fuga de agua',
    descripcion: 'La tubería del baño gotea desde ayer por la noche.',
    fotosUrls: [],
    direccionOculta: 'Calle 1 #123',
    fechaCitaPreferida: new Date(AHORA.getTime() + DIA),
    urgente: false,
    estado: EstadoSolicitud.PUBLICADA,
    creadaEn: new Date(AHORA.getTime() - 4 * HORA),
    venceEn: new Date(AHORA.getTime() + DIA),
    entroAlTope: null,
    cerradaEn: null,
    ...overrides,
  };
}

function crearZona(): Zona {
  return {
    id: 1,
    nombre: 'Centro',
    otb: 'OTB Centro',
    municipio: 'Cercado',
    zonasVecinas: [],
  };
}

function crearUsuario(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: SUPERVISOR_ID,
    telefono: '+59170000000',
    roles: [Rol.SUPERVISOR],
    rolActivo: Rol.SUPERVISOR,
    ...overrides,
  };
}

interface RepositorioConfiguracion {
  findOne: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

function crearRepositorioConfiguracion(
  configuracion: ConfiguracionAlerta | null = {
    id: 1,
    minutosSinOfertas: 120,
    actualizadaEn: AHORA,
    actualizadoPor: null,
  },
): RepositorioConfiguracion {
  return {
    findOne: vi.fn(async () => configuracion),
    create: vi.fn((datos: Partial<ConfiguracionAlerta>) => ({
      actualizadaEn: AHORA,
      ...datos,
    })),
    save: vi.fn(async (datos: ConfiguracionAlerta) => ({
      ...datos,
      actualizadaEn: AHORA,
    })),
  };
}

interface AlertasServiceDeps {
  configuracionRepository: RepositorioConfiguracion;
  alertaRepository: {
    find: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  solicitudRepository: { find: ReturnType<typeof vi.fn> };
  ofertaRepository: { find: ReturnType<typeof vi.fn> };
  zonaRepository: { findOne: ReturnType<typeof vi.fn> };
  dataSource: DataSource;
  manager: {
    findOne: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

function crearDependencias(): AlertasServiceDeps {
  const ejecutarInsercion = vi.fn(async () => undefined);
  const constructorInsercion = {
    insert: vi.fn(),
    values: vi.fn(),
    orIgnore: vi.fn(),
    execute: ejecutarInsercion,
  };
  constructorInsercion.insert.mockReturnValue(constructorInsercion);
  constructorInsercion.values.mockReturnValue(constructorInsercion);
  constructorInsercion.orIgnore.mockReturnValue(constructorInsercion);

  const manager = {
    findOne: vi.fn(async () => crearSolicitud()),
    count: vi.fn(async () => 0),
    save: vi.fn(async (_entidad: unknown, valor: unknown) => valor),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const dataSource = {
    transaction: vi.fn(
      async (callback: (manager: unknown) => unknown) => callback(manager),
    ),
  } as unknown as DataSource;

  return {
    configuracionRepository: crearRepositorioConfiguracion(),
    alertaRepository: {
      find: vi.fn(async () => []),
      update: vi.fn(async () => ({ affected: 0 })),
      createQueryBuilder: vi.fn(() => constructorInsercion),
    },
    solicitudRepository: { find: vi.fn(async () => []) },
    ofertaRepository: { find: vi.fn(async () => []) },
    zonaRepository: { findOne: vi.fn(async () => crearZona()) },
    dataSource,
    manager,
  };
}

function crearServicio(deps: AlertasServiceDeps): AlertasService {
  return new AlertasService(
    deps.configuracionRepository as never,
    deps.alertaRepository as never,
    deps.solicitudRepository as never,
    deps.ofertaRepository as never,
    deps.zonaRepository as never,
    deps.dataSource,
  );
}

describe('AlertasService', () => {
  let deps: AlertasServiceDeps;
  let servicio: AlertasService;

  beforeEach(() => {
    deps = crearDependencias();
    servicio = crearServicio(deps);
  });

  describe('configuración del periodo', () => {
    it('rechaza periodos que no sean enteros mayores a cero', async () => {
      await expect(
        servicio.actualizarConfiguracion(
          { minutos_sin_ofertas: 0 },
          SUPERVISOR_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(
        servicio.actualizarConfiguracion(
          { minutos_sin_ofertas: 1.5 },
          SUPERVISOR_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('persiste el nuevo periodo y devuelve las horas equivalentes', async () => {
      const resultado = await servicio.actualizarConfiguracion(
        { minutos_sin_ofertas: 90 },
        SUPERVISOR_ID,
      );

      expect(deps.configuracionRepository.save).toHaveBeenCalledOnce();
      expect(resultado.minutos_sin_ofertas).toBe(90);
      expect(resultado.horas_equivalentes).toBe(1.5);
    });
  });

  describe('detección de solicitudes sin ofertas', () => {
    it('crea una alerta persistente para una solicitud abierta y sin ofertas', async () => {
      const solicitud = crearSolicitud();
      deps.solicitudRepository.find.mockResolvedValue([solicitud]);
      deps.alertaRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'alerta-1',
            solicitudId: solicitud.id,
            estado: EstadoAlerta.ACTIVA,
            minutosConfigurados: 120,
            venceEnOriginal: solicitud.venceEn,
            creadaEn: AHORA,
            resueltaEn: null,
            resueltaPor: null,
            solicitud: { ...solicitud, zona: crearZona() },
          } satisfies AlertaSolicitud,
        ]);

      const resultado = await servicio.listar();

      const constructor = deps.alertaRepository.createQueryBuilder();
      expect(constructor.values).toHaveBeenCalledWith([
        expect.objectContaining({
          solicitudId: solicitud.id,
          estado: EstadoAlerta.ACTIVA,
          minutosConfigurados: 120,
          venceEnOriginal: solicitud.venceEn,
        }),
      ]);
      expect(constructor.orIgnore).toHaveBeenCalledOnce();
      expect(resultado.total).toBe(1);
      expect(resultado.alertas[0]?.solicitud_id).toBe(solicitud.id);
      expect(resultado.alertas[0]?.minutos_en_espera).toBe(240);
    });

    it('reinicia el conteo tras una ampliación y no regenera la alerta', async () => {
      const solicitud = crearSolicitud({
        creadaEn: new Date(AHORA.getTime() - 4 * HORA),
        ultimaAmpliacionEn: new Date(AHORA.getTime() - 10 * 60 * 1000),
      });
      deps.solicitudRepository.find.mockResolvedValue([solicitud]);
      deps.alertaRepository.find.mockResolvedValue([]);

      const resultado = await servicio.listar();

      expect(deps.alertaRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(resultado.total).toBe(0);
    });

    it('resuelve alertas cuando la solicitud ya recibió ofertas', async () => {
      const solicitud = crearSolicitud({
        estado: EstadoSolicitud.CON_OFERTAS,
      });
      deps.solicitudRepository.find.mockResolvedValue([solicitud]);
      deps.alertaRepository.find
        .mockResolvedValueOnce([
          {
            id: 'alerta-1',
            solicitudId: solicitud.id,
            estado: EstadoAlerta.ACTIVA,
          } as AlertaSolicitud,
        ])
        .mockResolvedValueOnce([]);
      deps.ofertaRepository.find.mockResolvedValue([
        { solicitudId: solicitud.id },
      ]);

      await servicio.listar();

      expect(deps.alertaRepository.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        expect.objectContaining({ estado: EstadoAlerta.RESUELTA }),
      );
      expect(deps.alertaRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('ampliación del plazo', () => {
    it('actualiza el vencimiento y resuelve la alerta activa', async () => {
      const solicitud = crearSolicitud();
      const nuevaFecha = new Date(AHORA.getTime() + 3 * DIA);
      deps.manager.findOne.mockResolvedValue(solicitud);

      const resultado = await servicio.ampliarPlazo(
        crearUsuario(),
        solicitud.id,
        { nueva_fecha: nuevaFecha.toISOString() },
      );

      expect(deps.manager.count).toHaveBeenCalledOnce();
      expect(deps.manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          venceEn: nuevaFecha,
          ultimaAmpliacionEn: expect.any(Date),
        }),
      );
      expect(deps.manager.update).toHaveBeenCalledWith(
        expect.anything(),
        {
          solicitudId: solicitud.id,
          estado: EstadoAlerta.ACTIVA,
        },
        expect.objectContaining({
          estado: EstadoAlerta.RESUELTA,
          resueltaPor: SUPERVISOR_ID,
        }),
      );
      expect(resultado.alertas_resueltas).toBe(1);
      expect(resultado.vence_en_nueva).toEqual(nuevaFecha);
    });

    it('no permite ampliar si la solicitud ya recibió ofertas', async () => {
      deps.manager.findOne.mockResolvedValue(crearSolicitud());
      deps.manager.count.mockResolvedValue(1);

      await expect(
        servicio.ampliarPlazo(crearUsuario(), '22222222-2222-4222-8222-222222222222', {
          nueva_fecha: new Date(AHORA.getTime() + 2 * DIA).toISOString(),
        }),
      ).rejects.toThrow('ya recibió ofertas');
    });

    it('exige una fecha posterior al plazo vigente', async () => {
      const solicitud = crearSolicitud();
      deps.manager.findOne.mockResolvedValue(solicitud);

      await expect(
        servicio.ampliarPlazo(crearUsuario(), solicitud.id, {
          nueva_fecha: solicitud.venceEn.toISOString(),
        }),
      ).rejects.toThrow('posterior al plazo actual');
    });

    it('exige una fecha futura', async () => {
      deps.manager.findOne.mockResolvedValue(crearSolicitud());

      await expect(
        servicio.ampliarPlazo(
          crearUsuario(),
          '22222222-2222-4222-8222-222222222222',
          { nueva_fecha: new Date(Date.now() - HORA).toISOString() },
        ),
      ).rejects.toThrow('posterior a la fecha actual');
    });

    it('rechaza solicitudes cerradas y solicitudes inexistentes', async () => {
      deps.manager.findOne.mockResolvedValue(
        crearSolicitud({ estado: EstadoSolicitud.CONFIRMADA }),
      );
      await expect(
        servicio.ampliarPlazo(
          crearUsuario(),
          '22222222-2222-4222-8222-222222222222',
          { nueva_fecha: new Date(AHORA.getTime() + 2 * DIA).toISOString() },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      deps.manager.findOne.mockResolvedValue(null);
      await expect(
        servicio.ampliarPlazo(
          crearUsuario(),
          '22222222-2222-4222-8222-222222222222',
          { nueva_fecha: new Date(AHORA.getTime() + 2 * DIA).toISOString() },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('solo permite ampliar a supervisores o superadmins', async () => {
      await expect(
        servicio.ampliarPlazo(
          crearUsuario({ rolActivo: Rol.CLIENTE, roles: [Rol.CLIENTE] }),
          '22222222-2222-4222-8222-222222222222',
          { nueva_fecha: new Date(AHORA.getTime() + 2 * DIA).toISOString() },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(deps.dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
