import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupervisionDevolucionesController } from './supervision-devoluciones.controller.js';
import type {
  DevolucionConSaldoPublica,
  PagoConSaldoPublica,
} from '../pagos/interfaces/devolucion-publica.interface.js';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import type { RegistrarDevolucionDto } from './dto/registrar-devolucion.dto.js';

function crearDevolucionConSaldo(): DevolucionConSaldoPublica {
  return {
    id: 'dev-1',
    pago_id: 'pago-1',
    motivo: 'Test',
    monto: 25,
    fecha_limite: '2026-11-20',
    estado: EstadoDevolucion.PENDIENTE,
    monto_original: 100,
    total_devuelto: 25,
    saldo_disponible: 75,
  };
}

function crearPagoConSaldo(): PagoConSaldoPublica {
  return {
    pago_id: 'pago-1',
    solicitud_id: 'sol-1',
    cliente_id: 'cliente-1',
    estado_qr: EstadoQr.PAGADO,
    monto_original: 100,
    total_devuelto: 25,
    saldo_disponible: 75,
    creada_en: '2026-01-05T10:00:00.000Z',
  };
}

describe('SupervisionDevolucionesController', () => {
  let controller: SupervisionDevolucionesController;
  let service: {
    listar: ReturnType<typeof vi.fn>;
    listarPagos: ReturnType<typeof vi.fn>;
    registrar: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      listar: vi.fn(),
      listarPagos: vi.fn(),
      registrar: vi.fn(),
    };
    controller = new SupervisionDevolucionesController(service as never);
  });

  it('delegar al servicio y devolver lista', async () => {
    const devoluciones = [crearDevolucionConSaldo(), crearDevolucionConSaldo()];
    service.listar.mockResolvedValue(devoluciones);

    const result = await controller.listar();

    expect(service.listar).toHaveBeenCalledOnce();
    expect(result).toEqual(devoluciones);
  });

  it('delega listarPagos al servicio', async () => {
    const pagos = [crearPagoConSaldo()];
    service.listarPagos.mockResolvedValue(pagos);

    const result = await controller.listarPagos();

    expect(service.listarPagos).toHaveBeenCalledOnce();
    expect(result).toEqual(pagos);
  });

  it('delega registrar al servicio con el DTO recibido', async () => {
    const dto: RegistrarDevolucionDto = {
      pago_id: 'pago-1',
      monto: 25,
      motivo: 'Daño parcial',
    };
    const devolucion = crearDevolucionConSaldo();
    service.registrar.mockResolvedValue(devolucion);

    const result = await controller.registrar(dto);

    expect(service.registrar).toHaveBeenCalledWith(dto);
    expect(result).toEqual(devolucion);
  });

  it('tiene los guardas JwtAuthGuard, RolesGuard y roles SUPERVISOR|SUPERADMIN', () => {
    const meta = Reflect.getMetadata(
      'roles',
      SupervisionDevolucionesController,
    );
    expect(meta).toContain('SUPERVISOR');
    expect(meta).toContain('SUPERADMIN');
  });
});
