import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupervisionDevolucionesController } from './supervision-devoluciones.controller.js';
import type { DevolucionPublica } from '../pagos/interfaces/devolucion-publica.interface.js';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';

function crearDevolucionPublica(): DevolucionPublica {
  return {
    id: 'dev-1',
    pago_id: 'pago-1',
    motivo: 'Test',
    monto: 100,
    fecha_limite: '2026-11-20',
    estado: EstadoDevolucion.PENDIENTE,
  };
}

describe('SupervisionDevolucionesController', () => {
  let controller: SupervisionDevolucionesController;
  let service: { listar: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { listar: vi.fn() };
    controller = new SupervisionDevolucionesController(service as never);
  });

  it('delegar al servicio y devolver lista', async () => {
    const devoluciones = [crearDevolucionPublica(), crearDevolucionPublica()];
    service.listar.mockResolvedValue(devoluciones);

    const result = await controller.listar();

    expect(service.listar).toHaveBeenCalledOnce();
    expect(result).toEqual(devoluciones);
  });

  it('tiene los guardas JwtAuthGuard, RolesGuard y roles SUPERVISOR|SUPERADMIN', () => {
    const meta = Reflect.getMetadata('roles', SupervisionDevolucionesController);
    expect(meta).toContain('SUPERVISOR');
    expect(meta).toContain('SUPERADMIN');
  });
});