import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoReclamo } from '../common/enums/estado-reclamo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { CONFIGURACION_POR_DEFECTO } from '../configuracion/configuracion.constants.js';
import type { ConfiguracionService } from '../configuracion/configuracion.service.js';
import type { Devolucion } from '../entities/devolucion.entity.js';
import type { Pago } from '../entities/pago.entity.js';
import type { Reclamo } from '../entities/reclamo.entity.js';
import type { Solicitud } from '../entities/solicitud.entity.js';
import { ReportesService } from './reportes.service.js';

function crearSolicitud(
  id: string,
  estado: EstadoSolicitud,
): Solicitud {
  return {
    id,
    estado,
    urgente: false,
    trabajadorConfirmadoId: null,
    creadaEn: new Date('2026-11-10T10:00:00.000Z'),
  } as Solicitud;
}

function crearPago(
  id: string,
  solicitudId: string,
  overrides: Partial<Pago> = {},
): Pago {
  return {
    id,
    solicitudId,
    precioTotalAcordado: 400,
    pagoInicial25: 100,
    comision5: 20,
    saldo75: 300,
    parteTrabajador20: 80,
    estadoQr: EstadoQr.PAGADO,
    ...overrides,
  } as Pago;
}

describe('ReportesService - RF34', () => {
  let service: ReportesService;
  let solicitudes: Solicitud[];
  let pagos: Pago[];
  let devoluciones: Devolucion[];
  let reclamos: Reclamo[];

  beforeEach(() => {
    solicitudes = [
      crearSolicitud('s1', EstadoSolicitud.FINALIZADA),
      crearSolicitud('s2', EstadoSolicitud.CANCELADA),
      crearSolicitud('s3', EstadoSolicitud.CANCELADA),
      crearSolicitud('s4', EstadoSolicitud.PUBLICADA),
    ];
    pagos = [
      crearPago('p1', 's1'),
      crearPago('p2', 's2'),
      crearPago('p3', 's3'),
      crearPago('p4', 's4', {
        estadoQr: EstadoQr.PENDIENTE,
        comision5: 10,
      }),
    ];
    devoluciones = [
      {
        id: 'd1',
        pagoId: 'p3',
        monto: 100,
        estado: EstadoDevolucion.PENDIENTE,
      } as Devolucion,
    ];
    reclamos = [
      {
        id: 'r1',
        solicitudId: 's1',
        estado: EstadoReclamo.ABIERTO,
        fechaApertura: new Date(Date.now() - 80 * 3_600_000),
      } as Reclamo,
    ];

    const solicitudRepository = {
      createQueryBuilder: vi.fn(() => ({
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn(async () => solicitudes),
      })),
    };
    const pagoRepository = {
      find: vi.fn(async () => pagos),
    };
    const devolucionRepository = {
      find: vi.fn(async () => devoluciones),
    };
    const reclamoRepository = {
      find: vi.fn(async () => reclamos),
    };
    const configuracion = {
      get: () => ({ ...CONFIGURACION_POR_DEFECTO }),
    } as unknown as ConfiguracionService;

    service = new ReportesService(
      solicitudRepository as never,
      pagoRepository as never,
      devolucionRepository as never,
      reclamoRepository as never,
      configuracion,
    );
  });

  it('expone comisión cobrada y devengada por separado', async () => {
    const reporte = await service.generar();

    expect(reporte.solicitudes.total).toBe(4);
    expect(reporte.solicitudes.por_estado[EstadoSolicitud.FINALIZADA]).toBe(
      1,
    );
    expect(reporte.comisiones.comision_cobrada).toBe(60);
    expect(reporte.comisiones.comision_devengada).toBe(40);
    expect(reporte.devoluciones.total).toBe(1);
    expect(reporte.devoluciones.monto_total).toBe(100);
    expect(reporte.reclamos.abiertos).toBe(1);
    expect(reporte.reclamos.vencidos_sla).toBe(1);
  });
});
