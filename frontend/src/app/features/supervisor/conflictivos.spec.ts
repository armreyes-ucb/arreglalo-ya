import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  ClienteConflictivoPublico,
  DetalleConflictoPublico,
  ResolucionConflictoPublica,
} from '../../core/models';
import { SupervisionService } from '../../core/supervision.service';
import { ToastService } from '../../core/toast.service';
import { ConflictivosSupervisor } from './conflictivos';

const CLIENTE_ID = '11111111-1111-4111-8111-111111111111';

const CASO_POTENCIAL: ClienteConflictivoPublico = {
  id: 'caso-1',
  cliente_id: CLIENTE_ID,
  reportes_acumulados: 0,
  motivo: '2 reclamos rechazados en 90 días',
  fecha_registro: '2026-05-01T00:00:00.000Z',
  advertir: false,
  estado: 'POTENCIAL',
  reportes_comprobados: 0,
  reportes_pendientes: 0,
  reclamos_totales: 3,
  reclamos_rechazados: 2,
  cancelaciones: 0,
  periodo_dias: 90,
  actualizado_en: '2026-05-01T00:00:00.000Z',
};

const CASO_CONFIRMADO: ClienteConflictivoPublico = {
  ...CASO_POTENCIAL,
  id: 'caso-2',
  estado: 'CONFIRMADO',
};

const CASO_DESESTIMADO: ClienteConflictivoPublico = {
  ...CASO_POTENCIAL,
  id: 'caso-3',
  estado: 'DESESTIMADO',
};

const RESOLUCION: ResolucionConflictoPublica = {
  id: 'resolucion-1',
  conflictivo_id: 'caso-1',
  cliente_id: CLIENTE_ID,
  supervisor_id: '66666666-6666-4666-8666-666666666666',
  decision: 'CONFIRMAR',
  justificacion: 'Reincidencia comprobada por el supervisor',
  indicadores: {},
  fecha: '2026-06-01T00:00:00.000Z',
};

const DETALLE: DetalleConflictoPublico = {
  cliente_id: CLIENTE_ID,
  estado: 'POTENCIAL',
  indicadores: {
    reclamos_totales: 3,
    reclamos_rechazados: 2,
    cancelaciones: 1,
    reportes_comprobados: 0,
    reportes_pendientes: 0,
    periodo_dias: 90,
  },
  motivos: ['2 reclamos rechazados en 90 días'],
  reclamos: [
    {
      id: 'reclamo-1',
      solicitud_id: '22222222-2222-4222-8222-222222222222',
      fecha: '2026-04-20T00:00:00.000Z',
      estado: 'RECHAZADO',
      motivo: 'No pagó el saldo',
    },
  ],
  cancelaciones: [
    {
      solicitud_id: '33333333-3333-4333-8333-333333333333',
      fecha: '2026-04-10T00:00:00.000Z',
    },
  ],
  resoluciones: [RESOLUCION],
};

describe('ConflictivosSupervisor', () => {
  async function crearComponente(casos: ClienteConflictivoPublico[] = [CASO_POTENCIAL]) {
    const supervision = {
      detectarConflictivos: vi.fn().mockResolvedValue({
        omitido: false,
        evaluados: 1,
        potenciales: 1,
        actualizados: 0,
        reabiertos: 0,
      }),
      listarConflictivos: vi.fn().mockResolvedValue(casos),
      obtenerDetalleConflictivo: vi.fn().mockResolvedValue(DETALLE),
      resolverConflictivo: vi.fn().mockResolvedValue(RESOLUCION),
      registrarConflictivo: vi.fn().mockResolvedValue(CASO_POTENCIAL),
    };
    const toast = { exito: vi.fn(), error: vi.fn(), info: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ConflictivosSupervisor],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SupervisionService, useValue: supervision },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConflictivosSupervisor);
    const componente = fixture.componentInstance as any;
    await vi.waitFor(() => expect(componente.cargando()).toBe(false));
    return { componente, fixture, supervision, toast };
  }

  it('ejecuta la detección al ingresar y luego consulta la bandeja', async () => {
    const { componente, supervision } = await crearComponente([
      CASO_POTENCIAL,
      CASO_CONFIRMADO,
      CASO_DESESTIMADO,
    ]);

    expect(supervision.detectarConflictivos).toHaveBeenCalledTimes(1);
    expect(supervision.listarConflictivos).toHaveBeenCalledTimes(1);
    expect(componente.resumen()).toEqual({
      potencial: 1,
      confirmado: 1,
      desestimado: 1,
    });
  });

  it('filtra los casos por estado', async () => {
    const { componente } = await crearComponente([
      CASO_POTENCIAL,
      CASO_CONFIRMADO,
      CASO_DESESTIMADO,
    ]);

    componente.estadoFiltro.set('CONFIRMADO');

    expect(componente.filtrados()).toHaveLength(1);
    expect(componente.filtrados()[0].id).toBe('caso-2');
  });

  it('mantiene la bandeja disponible si falla la detección automática', async () => {
    const { componente, supervision } = await crearComponente();
    supervision.detectarConflictivos.mockRejectedValueOnce(new Error('sin conexión'));

    await componente.detectar();

    expect(componente.errorDeteccion()).toContain('sin conexión');
    expect(componente.conflictivos()).toHaveLength(1);
  });

  it('carga el detalle con indicadores, evidencias e historial', async () => {
    const { componente } = await crearComponente();

    await componente.verDetalle(CLIENTE_ID);

    expect(componente.detalle()).toEqual(DETALLE);
    expect(componente.detalle().reclamos[0].estado).toBe('RECHAZADO');
    expect(componente.detalle().cancelaciones).toHaveLength(1);
    expect(componente.detalle().resoluciones).toHaveLength(1);
  });

  it('rechaza una justificación de resolución demasiado corta', async () => {
    const { componente, supervision } = await crearComponente();
    await componente.verDetalle(CLIENTE_ID);
    componente.justificacion = '   corta   ';

    await componente.resolver();

    expect(componente.errorResolucion()).toContain('10 y 1000');
    expect(supervision.resolverConflictivo).not.toHaveBeenCalled();
  });

  it('registra la resolución confirmada y recarga el detalle', async () => {
    const { componente, supervision, toast } = await crearComponente();
    await componente.verDetalle(CLIENTE_ID);
    componente.decision = 'CONFIRMAR';
    componente.justificacion = '  Reincidencia comprobada por el supervisor  ';

    await componente.resolver();

    expect(supervision.resolverConflictivo).toHaveBeenCalledWith(CLIENTE_ID, {
      decision: 'CONFIRMAR',
      justificacion: 'Reincidencia comprobada por el supervisor',
    });
    expect(supervision.listarConflictivos).toHaveBeenCalledTimes(2);
    expect(supervision.obtenerDetalleConflictivo).toHaveBeenCalledTimes(2);
    expect(toast.exito).toHaveBeenCalled();
    expect(componente.errorResolucion()).toBe('');
  });

  it('registra un cliente de forma manual y recarga la bandeja', async () => {
    const { componente, supervision, toast } = await crearComponente();
    componente.nuevoConflictivo = {
      cliente_id: CLIENTE_ID,
      motivo: 'Incumplió el pago del saldo',
    };

    await componente.registrar();

    expect(supervision.registrarConflictivo).toHaveBeenCalledWith({
      cliente_id: CLIENTE_ID,
      motivo: 'Incumplió el pago del saldo',
    });
    expect(supervision.listarConflictivos).toHaveBeenCalledTimes(2);
    expect(toast.exito).toHaveBeenCalled();
    expect(componente.nuevoConflictivo.cliente_id).toBe('');
  });
});
