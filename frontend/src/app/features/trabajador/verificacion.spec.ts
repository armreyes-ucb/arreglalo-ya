import {
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { EstadoVerificacion } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { VerificacionService } from '../../core/verificacion.service';
import { VerificacionTrabajador } from './verificacion';

const ESTADO: EstadoVerificacion = {
  perfil_id: 'perfil-1',
  estado: 'PENDIENTE',
  nivel_verificacion: 1,
  vence_antecedentes: null,
  antecedentes_registrados: false,
  antecedentes_por_vencer: false,
  antecedentes_vencidos: false,
  puede_ofertar: false,
  motivo_bloqueo: null,
  cuenta_bancaria: null,
  documentos: [],
};

function archivo(
  nombre: string,
  tipo: string,
  bytes = 1024,
): File {
  return { name: nombre, type: tipo, size: bytes } as File;
}

function entrada(seleccionado: File | null): Event {
  return {
    target: {
      files: seleccionado ? [seleccionado] : [],
      value: seleccionado?.name ?? '',
    },
  } as unknown as Event;
}

describe('VerificacionTrabajador', () => {
  async function crearComponente() {
    const estado = vi.fn().mockResolvedValue(ESTADO);
    const cargarDocumentos = vi.fn().mockResolvedValue({
      mensaje: 'Documentos recibidos',
    });
    const toast = {
      info: vi.fn(),
      exito: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [VerificacionTrabajador],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: VerificacionService,
          useValue: {
            estado,
            cargarDocumentos,
            descargarDocumento: vi.fn(),
          },
        },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(
      VerificacionTrabajador,
    );
    return {
      componente: fixture.componentInstance as any,
      cargarDocumentos,
      toast,
    };
  }

  it('mantiene los cinco documentos obligatorios', async () => {
    const { componente } = await crearComponente();

    expect(componente.tiposRequeridos).toHaveLength(5);
    expect(componente.tiposRequeridos).toContain('CERTIFICADO');
  });

  it('rechaza archivos mayores a 5 MB', async () => {
    const { componente, toast } = await crearComponente();

    componente.seleccionarArchivo(
      'REJAP',
      entrada(
        archivo('rejap.pdf', 'application/pdf', 6 * 1024 * 1024),
      ),
    );

    expect(componente.archivos().REJAP).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('5 MB'),
    );
  });

  it('rechaza formatos no permitidos', async () => {
    const { componente, toast } = await crearComponente();

    componente.seleccionarArchivo(
      'SELFIE',
      entrada(archivo('selfie.gif', 'image/gif')),
    );

    expect(componente.archivos().SELFIE).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('JPG, PNG o PDF'),
    );
  });

  it('acepta un archivo válido y permite quitarlo', async () => {
    const { componente } = await crearComponente();

    componente.seleccionarArchivo(
      'SELFIE',
      entrada(archivo('selfie.jpg', 'image/jpeg')),
    );
    expect(componente.archivos().SELFIE?.name).toBe('selfie.jpg');

    componente.quitarArchivo('SELFIE');
    expect(componente.archivos().SELFIE).toBeUndefined();
  });

  it('exige la cuenta bancaria antes de enviar', async () => {
    const { componente, cargarDocumentos } =
      await crearComponente();

    await componente.enviar();

    expect(componente.error()).toContain('banco');
    expect(cargarDocumentos).not.toHaveBeenCalled();
  });

  it('exige todos los documentos antes de enviar', async () => {
    const { componente, cargarDocumentos } =
      await crearComponente();
    componente.formulario.setValue({
      banco: 'Banco Unión',
      numero_cuenta: '12345678',
      titular: 'Ana Pérez',
      vence_antecedentes: '',
    });

    await componente.enviar();

    expect(componente.error()).toContain('Faltan documentos');
    expect(cargarDocumentos).not.toHaveBeenCalled();
  });

  it('envía la cuenta bancaria y los cinco documentos', async () => {
    const { componente, cargarDocumentos, toast } =
      await crearComponente();
    componente.formulario.setValue({
      banco: 'Banco Unión',
      numero_cuenta: '12345678',
      titular: 'Ana Pérez',
      vence_antecedentes: '',
    });
    componente.archivos.set({
      CARNET_ANVERSO: archivo('anverso.jpg', 'image/jpeg'),
      CARNET_REVERSO: archivo('reverso.png', 'image/png'),
      SELFIE: archivo('selfie.jpg', 'image/jpeg'),
      REJAP: archivo('rejap.pdf', 'application/pdf'),
      CERTIFICADO: archivo('certificado.pdf', 'application/pdf'),
    });

    await componente.enviar();

    expect(cargarDocumentos).toHaveBeenCalledTimes(1);
    expect(cargarDocumentos).toHaveBeenCalledWith(
      expect.objectContaining({
        banco: 'Banco Unión',
        numero_cuenta: '12345678',
        titular: 'Ana Pérez',
      }),
    );
    expect(componente.exito()).toBe('Documentos recibidos');
    expect(toast.exito).toHaveBeenCalled();
  });
});
