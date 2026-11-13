import { BadRequestException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { EstadoOferta } from '../common/enums/estado-oferta.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { PagosService } from './pagos.service.js';

const PAGO_ID = '77777777-7777-4777-8777-777777777777';
const SOLICITUD_ID = '44444444-4444-4444-8444-444444444444';
const CLIENTE_ID = '33333333-3333-4333-8333-333333333333';
const PERFIL_ID = '22222222-2222-4222-8222-222222222222';
const OFERTA_ID = '66666666-6666-4666-8666-666666666666';

function crearSolicitud(
  overrides: Partial<Solicitud> = {},
): Solicitud {
  return {
    id: SOLICITUD_ID,
    clienteId: CLIENTE_ID,
    trabajadorConfirmadoId: null,
    zonaId: 3,
    especialidad: EspecialidadTipo.PLOMERIA,
    tipoProblema: 'Fuga',
    descripcion: 'Fuga de agua',
    fotosUrls: [],
    direccionOculta: 'Calle Secreta 123',
    fechaCitaPreferida: new Date('2026-11-12T10:00:00.000Z'),
    urgente: false,
    estado: EstadoSolicitud.PENDIENTE_PAGO,
    creadaEn: new Date(),
    venceEn: new Date('2026-12-09T10:00:00.000Z'),
    entroAlTope: null,
    cerradaEn: null,
    ...overrides,
  };
}

function crearOferta(): Oferta {
  return {
    id: OFERTA_ID,
    solicitudId: SOLICITUD_ID,
    trabajadorId: PERFIL_ID,
    precioEstimado: 400,
    costoTransporte: 10,
    fechaPropuesta: new Date('2026-11-12T10:00:00.000Z'),
    mensaje: null,
    estado: EstadoOferta.ELEGIDA,
    creadaEn: new Date(),
  };
}

function crearPago(overrides: Partial<Pago> = {}): Pago {
  return {
    id: PAGO_ID,
    solicitudId: SOLICITUD_ID,
    precioTotalAcordado: 400,
    pagoInicial25: 100,
    parteTrabajador20: 80,
    comision5: 20,
    saldo75: 300,
    codigoQrData: 'data:image/png;base64,abc',
    qrVenceEn: new Date(Date.now() + 30 * 60_000),
    estadoQr: EstadoQr.PENDIENTE,
    yaPagueCliente: false,
    fechaYaPague: null,
    saldo75ConfirmadoTrabajador: false,
    fechaConfirmacionTrabajador: null,
    transferidoAlTrabajador: false,
    comprobanteTransferencia: null,
    ...overrides,
  };
}

describe('PagosService', () => {
  let manager: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let dataSource: { transaction: ReturnType<typeof vi.fn> };
  let service: PagosService;

  beforeEach(() => {
    manager = {
      findOne: vi.fn(),
      create: vi.fn((_entidad, datos) => ({ ...datos })),
      save: vi.fn(async (_entidad, datos) => {
        if (!datos.id) {
          datos.id = PAGO_ID;
        }
        return datos;
      }),
      update: vi.fn(),
    };
    dataSource = {
      transaction: vi.fn(async (callback) => callback(manager)),
    };
    service = new PagosService(
      dataSource as unknown as DataSource,
      new BusinessRulesService(),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('CP36: genera el QR del 25% con vencimiento a 30 minutos', async () => {
    manager.findOne.mockResolvedValue(null);
    const antes = Date.now();
    const oferta = crearOferta();
    oferta.estado = EstadoOferta.ENVIADA;

    const pago = await service.crearPagoInicial(
      manager,
      crearSolicitud(),
      oferta,
    );

    expect(pago.pagoInicial25).toBe(100);
    expect(pago.parteTrabajador20).toBe(80);
    expect(pago.comision5).toBe(20);
    expect(pago.saldo75).toBe(300);
    expect(pago.estadoQr).toBe(EstadoQr.PENDIENTE);
    expect(pago.codigoQrData).toMatch(
      /^data:image\/png;base64,/,
    );
    expect(pago.qrVenceEn?.getTime()).toBeGreaterThanOrEqual(
      antes + 29 * 60_000,
    );
  });

  it('CP28: confirma el pago, asigna trabajador y cierra las demás ofertas', async () => {
    const pago = crearPago();
    const solicitud = crearSolicitud();
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      if (entidad === Oferta) {
        return Promise.resolve(crearOferta());
      }
      return Promise.resolve(null);
    });

    const resultado = await service.confirmarPago(
      CLIENTE_ID,
      PAGO_ID,
    );

    expect(resultado.estado_qr).toBe(EstadoQr.PAGADO);
    expect(solicitud.estado).toBe(EstadoSolicitud.CONFIRMADA);
    expect(solicitud.trabajadorConfirmadoId).toBe(PERFIL_ID);
    expect(manager.update).toHaveBeenCalledWith(
      Oferta,
      {
        solicitudId: SOLICITUD_ID,
        estado: EstadoOferta.ENVIADA,
      },
      { estado: EstadoOferta.CERRADA },
    );
    expect(manager.save).toHaveBeenCalledWith(
      HistorialEstado,
      expect.objectContaining({
        estado: EstadoSolicitud.CONFIRMADA,
      }),
    );
  });

  it('es idempotente si el pago ya fue confirmado', async () => {
    const pago = crearPago({ estadoQr: EstadoQr.PAGADO });
    manager.findOne.mockImplementation((entidad) =>
      Promise.resolve(
        entidad === Pago
          ? pago
          : entidad === Solicitud
            ? crearSolicitud({
                estado: EstadoSolicitud.CONFIRMADA,
              })
            : null,
      ),
    );

    const resultado = await service.confirmarPago(
      CLIENTE_ID,
      PAGO_ID,
    );

    expect(resultado.estado_qr).toBe(EstadoQr.PAGADO);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rechaza la confirmación de un QR vencido', async () => {
    const pago = crearPago({
      qrVenceEn: new Date(Date.now() - 60_000),
    });
    manager.findOne.mockImplementation((entidad) =>
      Promise.resolve(
        entidad === Pago
          ? pago
          : entidad === Solicitud
            ? crearSolicitud()
            : null,
      ),
    );

    await expect(
      service.confirmarPago(CLIENTE_ID, PAGO_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(pago.estadoQr).toBe(EstadoQr.VENCIDO);
  });

  it('registra una devolución por el 25% con 3 días hábiles', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 9, 10, 0, 0));
    manager.findOne.mockResolvedValue(null);

    const devolucion = await service.registrarDevolucion(
      manager,
      crearPago(),
      'Rechazo del precio final',
    );

    expect(devolucion.monto).toBe(100);
    expect(devolucion.fechaLimite).toBe('2026-01-14');
    expect(manager.save).toHaveBeenCalledWith(
      Devolucion,
      expect.objectContaining({
        pagoId: PAGO_ID,
      }),
    );
  });
});
