import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { ExpedienteVerificacion } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { VerificacionService } from '../../core/verificacion.service';
import { RevisionVerificacion } from './revision';

const EXPEDIENTE: ExpedienteVerificacion = {
  trabajador_id: 'perfil-1',
  usuario_id: 'usuario-1',
  nombre_completo: 'Ana Pérez',
  telefono: '+59170000001',
  nivel_verificacion: 1,
  estado: 'PENDIENTE',
  vence_antecedentes: null,
  mas_de_48_horas: false,
  horas_en_espera: 3,
  cuenta_bancaria: null,
  documentos: [],
};

describe('RevisionVerificacion', () => {
  async function crearComponente() {
    const verificacion = {
      bandeja: vi.fn().mockResolvedValue([EXPEDIENTE]),
      revisar: vi.fn().mockResolvedValue({
        mensaje: 'Verificación aprobada',
      }),
    };
    const toast = {
      info: vi.fn(),
      exito: vi.fn(),
      error: vi.fn(),
    };
    const ruta = {
      snapshot: {
        paramMap: convertToParamMap({ id: 'perfil-1' }),
      },
    };

    await TestBed.configureTestingModule({
      imports: [RevisionVerificacion],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: VerificacionService, useValue: verificacion },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: ruta },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(
      RevisionVerificacion,
    );
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const componente = fixture.componentInstance as any;
    componente.expediente.set(EXPEDIENTE);
    componente.cargando.set(false);
    return { componente, verificacion, router, toast };
  }

  it('exige motivo para rechazar o pedir datos', async () => {
    const { componente, verificacion } = await crearComponente();
    componente.formulario.patchValue({
      decision: 'RECHAZAR',
      motivo_rechazo: '   ',
    });

    await componente.revisar();

    expect(componente.errorRevision()).toContain('motivo');
    expect(verificacion.revisar).not.toHaveBeenCalled();
  });

  it('aprueba con nivel y vuelve a la bandeja', async () => {
    const { componente, verificacion, router, toast } =
      await crearComponente();
    componente.formulario.patchValue({
      decision: 'APROBAR',
      nivel_verificacion: 3,
      vence_antecedentes: '',
    });

    await componente.revisar();

    expect(verificacion.revisar).toHaveBeenCalledWith(
      'perfil-1',
      expect.objectContaining({
        decision: 'APROBAR',
        nivel_verificacion: 3,
      }),
    );
    expect(router.navigate).toHaveBeenCalledWith([
      '/supervisor/verificaciones',
    ]);
    expect(toast.exito).toHaveBeenCalledWith(
      'Verificación aprobada',
    );
  });
});
