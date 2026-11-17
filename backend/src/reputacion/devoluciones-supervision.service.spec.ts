import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Devolucion } from '../entities/devolucion.entity.js';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';
import { DevolucionesSupervisionService } from './devoluciones-supervision.service.js';
import { toDevolucionPublica } from '../common/mappers/devolucion-publica.mapper.js';
import type { DevolucionPublica } from '../pagos/interfaces/devolucion-publica.interface.js';

function crearDevolucion(overrides: Partial<Devolucion> = {}): Devolucion {
  return {
    id: 'dev-1',
    pagoId: 'pago-1',
    motivo: 'Cancelación por trabajador',
    monto: 120.5,
    fechaLimite: '2026-11-20',
    estado: EstadoDevolucion.PENDIENTE,
    ...overrides,
  };
}

describe('DevolucionesSupervisionService', () => {
  let service: DevolucionesSupervisionService;
  let repo: { find: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repo = { find: vi.fn() };
    service = new DevolucionesSupervisionService(repo as never);
  });

  it('lista devoluciones ordenadas por fecha_limite ASC y mapea a pública', async () => {
    const d1 = crearDevolucion({ id: 'd1', fechaLimite: '2026-11-25', monto: 100 });
    const d2 = crearDevolucion({ id: 'd2', fechaLimite: '2026-11-20', monto: 50 });
    repo.find.mockResolvedValue([d2, d1]);

    const result = await service.listar();

    expect(repo.find).toHaveBeenCalledWith({ order: { fechaLimite: 'ASC' } });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(toDevolucionPublica(d2));
    expect(result[1]).toEqual(toDevolucionPublica(d1));
  });

  it('devuelve array vacío si no hay devoluciones', async () => {
    repo.find.mockResolvedValue([]);
    const result = await service.listar();
    expect(result).toEqual([]);
  });

  it('mapea correctamente todos los campos de DevolucionPublica', async () => {
    const d = crearDevolucion({
      id: 'dev-x',
      pagoId: 'pago-x',
      motivo: 'Test',
      monto: 75.25,
      fechaLimite: '2026-12-01',
      estado: EstadoDevolucion.COMPLETADA,
    });
    repo.find.mockResolvedValue([d]);

    const result = await service.listar();
    const mapped = toDevolucionPublica(d);
    expect(result[0]).toEqual(mapped);
    expect(result[0]).toMatchObject<DevolucionPublica>({
      id: 'dev-x',
      pago_id: 'pago-x',
      motivo: 'Test',
      monto: 75.25,
      fecha_limite: '2026-12-01',
      estado: EstadoDevolucion.COMPLETADA,
    });
  });
});