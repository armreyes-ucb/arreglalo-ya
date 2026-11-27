import { BadRequestException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { CONFIGURACION_POR_DEFECTO } from '../configuracion/configuracion.constants.js';
import type { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { DevolucionesSupervisionService } from './devoluciones-supervision.service.js';

const PAGO_ID = '77777777-7777-4777-8777-777777777777';
const PAGO_2_ID = '88888888-8888-4888-8888-888888888888';
const SOLICITUD_ID = '44444444-4444-4444-8444-444444444444';
const CLIENTE_ID = '33333333-3333-4333-8333-333333333333';

function crearDevolucion(overrides: Partial<Devolucion> = {}): Devolucion {
  return {
    id: 'dev-1',
    pagoId: PAGO_ID,
    motivo: 'Devolución parcial',
    monto: 40,
    fechaLimite: '2026-01-12',
    estado: EstadoDevolucion.PENDIENTE,
    ...overrides,
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
    codigoQrData: null,
    qrVenceEn: null,
    estadoQr: EstadoQr.PAGADO,
    yaPagueCliente: true,
    fechaYaPague: new Date(),
    saldo75ConfirmadoTrabajador: false,
    fechaConfirmacionTrabajador: null,
    transferidoAlTrabajador: false,
    comprobanteTransferencia: null,
    solicitud: {
      id: SOLICITUD_ID,
      clienteId: CLIENTE_ID,
      creadaEn: new Date('2026-01-05T10:00:00.000Z'),
    } as never,
    ...overrides,
  };
}

describe('DevolucionesSupervisionService', () => {
  let service: DevolucionesSupervisionService;
  let devolucionRepo: { find: ReturnType<typeof vi.fn> };
  let pagoRepo: { find: ReturnType<typeof vi.fn> };
  let manager: {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let dataSource: { transaction: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    devolucionRepo = { find: vi.fn().mockResolvedValue([]) };
    pagoRepo = { find: vi.fn().mockResolvedValue([]) };
    manager = {
      findOne: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((_entidad, datos) => ({ ...datos })),
      save: vi.fn(async (_entidad, datos) => datos),
    };
    dataSource = {
      transaction: vi.fn(async (callback) => callback(manager)),
    };
    service = new DevolucionesSupervisionService(
      devolucionRepo as never,
      pagoRepo as never,
      dataSource as never,
      new BusinessRulesService(),
      {
        get: () => ({ ...CONFIGURACION_POR_DEFECTO }),
      } as unknown as ConfiguracionService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('listar', () => {
    it('devuelve array vacío si no hay devoluciones', async () => {
      const result = await service.listar();
      expect(result).toEqual([]);
      expect(pagoRepo.find).not.toHaveBeenCalled();
    });

    it('agrega el acumulado y el saldo por pago', async () => {
      const d1 = crearDevolucion({ id: 'd1', monto: 40 });
      const d2 = crearDevolucion({
        id: 'd2',
        pagoId: PAGO_ID,
        monto: 30,
      });
      const d3 = crearDevolucion({
        id: 'd3',
        pagoId: PAGO_2_ID,
        monto: 100,
      });
      devolucionRepo.find.mockResolvedValue([d1, d2, d3]);
      pagoRepo.find.mockResolvedValue([
        crearPago(),
        crearPago({ id: PAGO_2_ID }),
      ]);

      const result = await service.listar();

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        id: 'd1',
        monto: 40,
        monto_original: 100,
        total_devuelto: 70,
        saldo_disponible: 30,
      });
      expect(result[1]).toMatchObject({
        id: 'd2',
        total_devuelto: 70,
        saldo_disponible: 30,
      });
      expect(result[2]).toMatchObject({
        id: 'd3',
        monto_original: 100,
        total_devuelto: 100,
        saldo_disponible: 0,
      });
    });
  });

  describe('listarPagos', () => {
    it('lista pagos confirmados con su saldo y ordena por fecha de creación', async () => {
      pagoRepo.find.mockResolvedValue([
        crearPago({ id: PAGO_ID }),
        crearPago({
          id: PAGO_2_ID,
          pagoInicial25: 250,
          solicitud: {
            id: 'sol-2',
            clienteId: CLIENTE_ID,
            creadaEn: new Date('2026-01-10T10:00:00.000Z'),
          } as never,
        }),
      ]);
      devolucionRepo.find.mockResolvedValue([
        crearDevolucion({ pagoId: PAGO_ID, monto: 100 }),
      ]);

      const result = await service.listarPagos();

      expect(pagoRepo.find).toHaveBeenCalledWith({
        where: { estadoQr: EstadoQr.PAGADO },
        relations: { solicitud: true },
      });
      expect(result[0].pago_id).toBe(PAGO_2_ID);
      expect(result[0].monto_original).toBe(250);
      expect(result[0].saldo_disponible).toBe(250);
      expect(result[1].pago_id).toBe(PAGO_ID);
      expect(result[1].total_devuelto).toBe(100);
      expect(result[1].saldo_disponible).toBe(0);
    });
  });

  describe('registrar', () => {
    it('registra una devolución parcial dentro del saldo', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 9, 10, 0, 0));
      manager.findOne.mockResolvedValue(crearPago());
      manager.find.mockResolvedValue([crearDevolucion({ monto: 40 })]);

      const result = await service.registrar({
        pago_id: PAGO_ID,
        monto: 25.5,
        motivo: '  Daño parcial  ',
      });

      expect(manager.save).toHaveBeenCalledWith(
        Devolucion,
        expect.objectContaining({
          pagoId: PAGO_ID,
          monto: 25.5,
          motivo: 'Daño parcial',
          fechaLimite: '2026-01-14',
          estado: EstadoDevolucion.PENDIENTE,
        }),
      );
      expect(result).toMatchObject({
        pago_id: PAGO_ID,
        monto: 25.5,
        monto_original: 100,
        total_devuelto: 65.5,
        saldo_disponible: 34.5,
      });
    });

    it('rechaza la devolución si supera el saldo acumulado', async () => {
      manager.findOne.mockResolvedValue(crearPago());
      manager.find.mockResolvedValue([crearDevolucion({ monto: 40 })]);

      await expect(
        service.registrar({
          pago_id: PAGO_ID,
          monto: 70,
          motivo: 'Excede',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('rechaza el pago inexistente', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.registrar({
          pago_id: PAGO_ID,
          monto: 10,
          motivo: 'Test',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza pagos no confirmados', async () => {
      manager.findOne.mockResolvedValue(
        crearPago({ estadoQr: EstadoQr.PENDIENTE }),
      );

      await expect(
        service.registrar({
          pago_id: PAGO_ID,
          monto: 10,
          motivo: 'Test',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('rechaza montos no positivos', async () => {
      manager.findOne.mockResolvedValue(crearPago());

      await expect(
        service.registrar({
          pago_id: PAGO_ID,
          monto: 0,
          motivo: 'Test',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('permite devolver exactamente el saldo restante', async () => {
      manager.findOne.mockResolvedValue(crearPago());
      manager.find.mockResolvedValue([crearDevolucion({ monto: 60 })]);

      const result = await service.registrar({
        pago_id: PAGO_ID,
        monto: 40,
        motivo: 'Saldo final',
      });

      expect(result.saldo_disponible).toBe(0);
      expect(result.total_devuelto).toBe(100);
    });
  });
});
