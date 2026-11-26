import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
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
      revisarDocumento: vi.fn().mockResolvedValue({
        mensaje: 'Documento aprobado',
      }),
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

    const fixture = TestBed.createComponent(RevisionVerificacion);
    await fixture.whenStable();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const componente = fixture.componentInstance as any;
    componente.expediente.set(EXPEDIENTE);
    componente.cargando.set(false);
    return { componente, verificacion, router, toast };
  }

  it('exige comentario al solicitar corrección individual', async () => {
    const { componente, verificacion } = await crearComponente();
    const documento = { id: 'doc-1' };
    const comentario = { value: '   ', focus: vi.fn() } as any;

    await componente.revisarDocumento(documento, 'REQUIERE_DATOS', comentario);

    expect(componente.errorRevision()).toContain('obligatorio');
    expect(comentario.focus).toHaveBeenCalled();
    expect(verificacion.revisarDocumento).not.toHaveBeenCalled();
  });

  it('envía decisión individual y actualiza el expediente', async () => {
    const { componente, verificacion, toast } = await crearComponente();
    verificacion.revisarDocumento = vi.fn().mockResolvedValue({ mensaje: 'Documento aprobado' });
    const documento = { id: 'doc-1' };
    const comentario = { value: 'Documento legible' } as any;

    await componente.revisarDocumento(documento, 'APROBAR', comentario);

    expect(verificacion.revisarDocumento).toHaveBeenCalledWith('perfil-1', 'doc-1', {
      decision: 'APROBAR',
      motivo_rechazo: 'Documento legible',
    });
    expect(verificacion.bandeja).toHaveBeenCalledTimes(2);
    expect(toast.exito).toHaveBeenCalledWith('Documento aprobado');
  });
});
