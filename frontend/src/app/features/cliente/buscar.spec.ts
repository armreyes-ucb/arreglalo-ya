import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { TrabajadorMatch, Zona } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { ZonasService } from '../../core/zonas.service';
import { BuscarTrabajadores } from './buscar';

const ZONA: Zona = {
  id: 1,
  nombre: 'Centro',
  otb: 'OTB Centro',
  municipio: 'Cercado',
  zonas_vecinas: [],
};

const TRABAJADOR: TrabajadorMatch = {
  id: 'perfil-1',
  nombre_completo: 'Ana Pérez',
  especialidades: ['PLOMERIA'],
  horarios: 'Lunes a sábado',
  precios_estimados: { PLOMERIA: 80, ELECTRICIDAD: 50 },
  promedio: 4.8,
  trabajos_completados: 12,
  nivel_verificacion: 3,
  zonas: [ZONA],
  fotos_trabajos: [],
  distancia: 0,
};

describe('BuscarTrabajadores', () => {
  async function crearComponente() {
    const zonas = { listar: vi.fn().mockResolvedValue([ZONA]) };
    const trabajadores = {
      buscar: vi.fn().mockResolvedValue([TRABAJADOR]),
    };
    const toast = {
      info: vi.fn(),
      exito: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BuscarTrabajadores],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ZonasService, useValue: zonas },
        { provide: TrabajadoresService, useValue: trabajadores },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BuscarTrabajadores);
    await fixture.whenStable();
    return {
      componente: fixture.componentInstance as any,
      trabajadores,
      toast,
      fixture,
    };
  }

  it('exige una zona específica para buscar', async () => {
    const { componente, trabajadores, toast } = await crearComponente();
    componente.filtros.patchValue({ zona_id: 0 });

    await componente.buscar();

    expect(componente.sinZona()).toBe(true);
    expect(toast.info).toHaveBeenCalled();
    expect(trabajadores.buscar).not.toHaveBeenCalled();
  });

  it('permite quitar el filtro de especialidad', async () => {
    const { componente, trabajadores } = await crearComponente();
    componente.filtros.patchValue({
      zona_id: 1,
      especialidad: '',
    });

    await componente.buscar();

    expect(trabajadores.buscar).toHaveBeenCalledWith(1, null);
    expect(componente.resultados()).toEqual([TRABAJADOR]);
  });

  it('muestra el precio menor como "Desde"', async () => {
    const { componente, fixture } = await crearComponente();
    componente.resultados.set([TRABAJADOR]);
    componente.buscado.set(true);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Desde Bs 50,00',
    );
  });
});
