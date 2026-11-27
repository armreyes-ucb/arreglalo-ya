import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  ClienteConflictivoConfiguracion,
  ConfiguracionPlataforma,
} from '../../core/models';
import { AdminService } from '../../core/admin.service';
import { ToastService } from '../../core/toast.service';
import { ConfiguracionAdmin } from './configuracion';

const CONFIGURACION: ConfiguracionPlataforma = {
  comision_pct: 5,
  pago_inicial_pct: 25,
  factor_urgente: 1.1,
  minutos_vigencia_qr: 30,
  horas_cancelacion_sin_penalidad: 2,
  dias_habiles_devolucion: 3,
  horas_cierre_automatico: 48,
  dias_caducidad_solicitud: 30,
  dias_tope_urgente: 3,
  dias_pausa_maxima: 30,
  dias_pausa_baja: 60,
  dias_aviso_antecedentes: 15,
  dias_reclamo: 7,
  horas_respuesta_reclamo: 48,
  horas_sla_supervisor: 72,
};

const CRITERIOS: ClienteConflictivoConfiguracion = {
  deteccion_activa: true,
  periodo_dias: 90,
  min_reclamos_rechazados: 2,
  min_cancelaciones: 3,
  min_reportes: 3,
  min_reclamos_totales: 0,
  actualizado_en: '2026-06-01T00:00:00.000Z',
  actualizado_por: null,
};

describe('ConfiguracionAdmin', () => {
  async function crearComponente() {
    const admin = {
      obtenerConfiguracion: vi.fn().mockResolvedValue(CONFIGURACION),
      historialConfiguracion: vi.fn().mockResolvedValue([]),
      obtenerConfiguracionConflictivos: vi.fn().mockResolvedValue(CRITERIOS),
      actualizarConfiguracion: vi.fn().mockResolvedValue(CONFIGURACION),
      actualizarConfiguracionConflictivos: vi
        .fn()
        .mockImplementation(async (payload: Partial<ClienteConflictivoConfiguracion>) => ({
          ...CRITERIOS,
          ...payload,
        })),
    };
    const toast = { exito: vi.fn(), error: vi.fn(), info: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ConfiguracionAdmin],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AdminService, useValue: admin },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConfiguracionAdmin);
    const componente = fixture.componentInstance as any;
    await vi.waitFor(() => expect(componente.cargando()).toBe(false));
    return { componente, fixture, admin, toast };
  }

  it('carga los criterios de clientes conflictivos por separado', async () => {
    const { componente, admin } = await crearComponente();

    expect(admin.obtenerConfiguracionConflictivos).toHaveBeenCalledTimes(1);
    expect(componente.criteriosForm).toEqual({
      deteccion_activa: true,
      periodo_dias: 90,
      min_reclamos_rechazados: 2,
      min_cancelaciones: 3,
      min_reportes: 3,
      min_reclamos_totales: 0,
    });
  });

  it('guarda los criterios en PostgreSQL mediante el endpoint administrativo', async () => {
    const { componente, admin, toast } = await crearComponente();
    componente.criteriosForm.min_cancelaciones = 4;
    componente.criteriosForm.periodo_dias = 60;

    await componente.guardarCriterios();

    expect(admin.actualizarConfiguracionConflictivos).toHaveBeenCalledWith({
      deteccion_activa: true,
      periodo_dias: 60,
      min_reclamos_rechazados: 2,
      min_cancelaciones: 4,
      min_reportes: 3,
      min_reclamos_totales: 0,
    });
    expect(componente.criterios().min_cancelaciones).toBe(4);
    expect(toast.exito).toHaveBeenCalled();
  });

  it('muestra el error del backend al guardar criterios inválidos', async () => {
    const { componente, admin } = await crearComponente();
    admin.actualizarConfiguracionConflictivos.mockRejectedValueOnce(
      new Error('Con la detección activa debe existir al menos un criterio'),
    );

    await componente.guardarCriterios();

    expect(componente.errorCriterios()).toContain('al menos un criterio');
  });
});
