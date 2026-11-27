import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { Zona } from '../../core/models';
import { SolicitudesService } from '../../core/solicitudes.service';
import { ToastService } from '../../core/toast.service';
import { UploadsService } from '../../core/uploads.service';
import { ZonasService } from '../../core/zonas.service';
import { PublicarSolicitud } from './publicar';

const ZONA_ACTIVA: Zona = {
  id: 1,
  nombre: 'Centro',
  otb: 'OTB Centro',
  municipio: 'Cercado',
  zonas_vecinas: [],
  activa: true,
};

const ZONA_INACTIVA: Zona = {
  id: 2,
  nombre: 'Sur',
  otb: 'OTB Sur',
  municipio: 'Cercado',
  zonas_vecinas: [],
  activa: false,
};

const ZONAS: Zona[] = [ZONA_ACTIVA, ZONA_INACTIVA];

const DESCRIPCION = 'Hay una fuga de agua debajo del lavamanos de la cocina.';

describe('PublicarSolicitud', () => {
  async function crearComponente() {
    const zonas = { listar: vi.fn().mockResolvedValue(ZONAS) };
    const solicitudes = { crear: vi.fn() };
    const uploads = { subirImagen: vi.fn() };
    const toast = {
      info: vi.fn(),
      exito: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PublicarSolicitud],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ZonasService, useValue: zonas },
        { provide: SolicitudesService, useValue: solicitudes },
        { provide: UploadsService, useValue: uploads },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PublicarSolicitud);
    await fixture.whenStable();
    return {
      componente: fixture.componentInstance as any,
      solicitudes,
      fixture,
    };
  }

  function completarPasoUno(componente: any): void {
    componente.formulario.patchValue({
      especialidad: 'PLOMERIA',
      tipo_problema: 'Fuga de agua',
      descripcion: DESCRIPCION,
    });
  }

  function completarPasoDos(componente: any): void {
    componente.formulario.patchValue({
      zona_id: ZONA_ACTIVA.id,
      direccion_oculta: 'Calle Secreta 123',
      fecha_cita_preferida: '2030-01-01T10:00',
    });
  }

  it('bloquea el avance si falta la descripción mínima', async () => {
    const { componente } = await crearComponente();

    componente.siguiente();

    expect(componente.error()).toContain('Completa');
    expect(componente.paso()).toBe(1);
  });

  it('exige al menos una foto antes de confirmar', async () => {
    const { componente } = await crearComponente();
    completarPasoUno(componente);
    componente.siguiente();
    completarPasoDos(componente);

    componente.siguiente();

    expect(componente.paso()).toBe(2);
    expect(componente.error()).toContain('foto');

    componente.fotos.set(['https://fotos/1.jpg']);
    componente.siguiente();

    expect(componente.paso()).toBe(3);
  });

  it('muestra solo las zonas activas en el selector', async () => {
    const { componente, fixture } = await crearComponente();
    completarPasoUno(componente);
    componente.siguiente();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(componente.paso()).toBe(2);
    expect(componente.zonas()).toEqual([ZONA_ACTIVA]);
    const opciones = Array.from(
      fixture.nativeElement.querySelectorAll('#zona option'),
    ) as HTMLOptionElement[];
    expect(opciones.map((opcion) => opcion.value)).toEqual(['0', '1']);
    expect(opciones.map((opcion) => opcion.textContent?.trim())).toEqual([
      'Selecciona tu zona',
      'Centro · Cercado',
    ]);
  });

  it('envía el zona_id de la zona activa seleccionada con urgencia, fotos y datos ocultos', async () => {
    const { componente, solicitudes } = await crearComponente();
    completarPasoUno(componente);
    completarPasoDos(componente);
    componente.formulario.patchValue({ urgente: true });
    componente.fotos.set(['https://fotos/1.jpg']);
    solicitudes.crear.mockResolvedValue({
      id: 'solicitud-1',
      tipo_problema: 'Fuga de agua',
      zona: ZONA_ACTIVA,
    });

    await componente.publicar();

    expect(solicitudes.crear).toHaveBeenCalledWith({
      zona_id: ZONA_ACTIVA.id,
      especialidad: 'PLOMERIA',
      tipo_problema: 'Fuga de agua',
      descripcion: DESCRIPCION,
      fotos_urls: ['https://fotos/1.jpg'],
      direccion_oculta: 'Calle Secreta 123',
      fecha_cita_preferida: expect.any(String),
      urgente: true,
    });
    expect(componente.paso()).toBe(4);
  });
});
