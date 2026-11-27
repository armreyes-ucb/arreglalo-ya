import type { DataSource, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { SancionesService } from '../common/services/sanciones.service.js';
import { CONFIGURACION_POR_DEFECTO } from '../configuracion/configuracion.constants.js';
import type { ConfiguracionPlataforma } from '../configuracion/interfaces/configuracion-plataforma.interface.js';
import type { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { Pago } from '../entities/pago.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { SolicitudesService } from './solicitudes.service.js';

const AHORA = new Date('2026-11-16T12:00:00.000Z');
const DIA = 24 * 60 * 60 * 1000;

function crearSolicitud(
  overrides: Partial<Solicitud> = {},
): Solicitud {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    clienteId: '22222222-2222-4222-8222-222222222222',
    trabajadorConfirmadoId: null,
    zonaId: 1,
    urgente: false,
    estado: EstadoSolicitud.PUBLICADA,
    creadaEn: new Date(AHORA.getTime() - 40 * DIA),
    venceEn: new Date(AHORA.getTime() - DIA),
    entroAlTope: null,
    cerradaEn: null,
    ...overrides,
  } as Solicitud;
}

function crearPago(overrides: Partial<Pago> = {}): Pago {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    solicitudId: '11111111-1111-4111-8111-111111111111',
    estadoQr: EstadoQr.VENCIDO,
    qrVenceEn: null,
    ...overrides,
  } as Pago;
}

function crearServicio(
  solicitudes: Solicitud[],
  pago: Pago | null,
  configuracion: ConfiguracionPlataforma,
): {
  service: SolicitudesService;
  manager: {
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
} {
  const manager = {
    findOne: vi.fn(async (entidad: unknown) =>
      entidad === Solicitud ? solicitudes[0] : pago,
    ),
    update: vi.fn(async () => ({ affected: 1 })),
    save: vi.fn(async (_entidad: unknown, datos: unknown) => datos),
    create: vi.fn((_entidad: unknown, datos: unknown) => ({
      ...(datos as object),
    })),
  };
  const solicitudRepository = {
    find: vi.fn(async () => solicitudes),
  };
  const dataSource = {
    transaction: vi.fn(async (callback: (m: unknown) => unknown) =>
      callback(manager),
    ),
  };
  const configuracionService = {
    get: () => ({ ...configuracion }),
  } as unknown as ConfiguracionService;

  const service = new SolicitudesService(
    solicitudRepository as unknown as Repository<Solicitud>,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    new BusinessRulesService(),
    new SancionesService(new BusinessRulesService()),
    dataSource as unknown as DataSource,
    configuracionService,
  );

  return { service, manager };
}

describe('SolicitudesService - RN06 anulación automática', () => {
  let configuracion: ConfiguracionPlataforma;

  beforeEach(() => {
    configuracion = { ...CONFIGURACION_POR_DEFECTO };
  });

  it('CP07: anula a los 30 días una PENDIENTE_PAGO con QR vencido', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.PENDIENTE_PAGO,
      venceEn: new Date(AHORA.getTime() - DIA),
    });
    const pago = crearPago({
      estadoQr: EstadoQr.PENDIENTE,
      qrVenceEn: new Date(AHORA.getTime() - 60_000),
    });
    const { service, manager } = crearServicio(
      [solicitud],
      pago,
      configuracion,
    );

    const anuladas = await service.anularVencidas(AHORA);

    expect(anuladas).toBe(1);
    expect(solicitud.estado).toBe(EstadoSolicitud.ANULADA);
    expect(manager.save).toHaveBeenCalled();
    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ estadoQr: EstadoQr.PENDIENTE }),
      expect.objectContaining({ estadoQr: EstadoQr.VENCIDO }),
    );
  });

  it('CP07: anula una solicitud normal sin confirmar al día 31', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.PUBLICADA,
      venceEn: new Date(AHORA.getTime() - 1),
    });
    const { service } = crearServicio([solicitud], null, configuracion);

    const anuladas = await service.anularVencidas(AHORA);

    expect(anuladas).toBe(1);
    expect(solicitud.estado).toBe(EstadoSolicitud.ANULADA);
  });

  it('CP07: no anula una solicitud normal que todavía está dentro del plazo', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.PUBLICADA,
      venceEn: new Date(AHORA.getTime() + 60_000),
    });
    const { service } = crearServicio([solicitud], null, configuracion);

    const anuladas = await service.anularVencidas(AHORA);

    expect(anuladas).toBe(0);
    expect(solicitud.estado).toBe(EstadoSolicitud.PUBLICADA);
  });

  it('CP07: no anula una PENDIENTE_PAGO cuyo QR sigue vigente', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.PENDIENTE_PAGO,
      venceEn: new Date(AHORA.getTime() - DIA),
    });
    const pago = crearPago({
      estadoQr: EstadoQr.PENDIENTE,
      qrVenceEn: new Date(AHORA.getTime() + 10 * 60_000),
    });
    const { service } = crearServicio([solicitud], pago, configuracion);

    const anuladas = await service.anularVencidas(AHORA);

    expect(anuladas).toBe(0);
    expect(solicitud.estado).toBe(EstadoSolicitud.PENDIENTE_PAGO);
  });

  it('CP08: anula una urgente que lleva más de 3 días en el tope', async () => {
    const solicitud = crearSolicitud({
      urgente: true,
      estado: EstadoSolicitud.PUBLICADA,
      venceEn: new Date(AHORA.getTime() + 10 * DIA),
      entroAlTope: new Date(AHORA.getTime() - 4 * DIA),
    });
    const { service } = crearServicio([solicitud], null, configuracion);

    const anuladas = await service.anularVencidas(AHORA);

    expect(anuladas).toBe(1);
    expect(solicitud.estado).toBe(EstadoSolicitud.ANULADA);
  });

  it('CP08: no anula una urgente con menos de 3 días en el tope', async () => {
    const solicitud = crearSolicitud({
      urgente: true,
      estado: EstadoSolicitud.CON_OFERTAS,
      venceEn: new Date(AHORA.getTime() + 10 * DIA),
      entroAlTope: new Date(AHORA.getTime() - 2 * DIA),
    });
    const { service } = crearServicio([solicitud], null, configuracion);

    const anuladas = await service.anularVencidas(AHORA);

    expect(anuladas).toBe(0);
    expect(solicitud.estado).toBe(EstadoSolicitud.CON_OFERTAS);
  });

  it('CP08: la regla de 3 días no aplica a una PENDIENTE_PAGO ya tomada', async () => {
    const solicitud = crearSolicitud({
      urgente: true,
      estado: EstadoSolicitud.PENDIENTE_PAGO,
      venceEn: new Date(AHORA.getTime() + 10 * DIA),
      entroAlTope: new Date(AHORA.getTime() - 5 * DIA),
    });
    const pago = crearPago({
      estadoQr: EstadoQr.PENDIENTE,
      qrVenceEn: new Date(AHORA.getTime() + 10 * 60_000),
    });
    const { service } = crearServicio([solicitud], pago, configuracion);

    const anuladas = await service.anularVencidas(AHORA);

    expect(anuladas).toBe(0);
    expect(solicitud.estado).toBe(EstadoSolicitud.PENDIENTE_PAGO);
  });
});
