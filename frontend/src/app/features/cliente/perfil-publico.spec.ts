import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { TrabajadorPublico, Zona } from '../../core/models';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { PerfilPublico } from './perfil-publico';

const ZONA: Zona = {
  id: 1,
  nombre: 'Centro',
  otb: 'OTB Centro',
  municipio: 'Cercado',
  zonas_vecinas: [],
};

const PERFIL: TrabajadorPublico = {
  id: 'perfil-1',
  nombre_completo: 'Ana Pérez',
  especialidades: ['PLOMERIA'],
  horarios: 'Lunes a sábado de 08:00 a 18:00',
  precios_estimados: { PLOMERIA: 80 },
  promedio: 4.8,
  trabajos_completados: 12,
  nivel_verificacion: 3,
  zonas: [ZONA],
  fotos_trabajos: [],
};

describe('PerfilPublico', () => {
  async function crearComponente() {
    const trabajadores = {
      perfilPublico: vi.fn().mockResolvedValue(PERFIL),
    };
    const ruta = {
      snapshot: {
        paramMap: convertToParamMap({ id: 'perfil-1' }),
      },
    };

    await TestBed.configureTestingModule({
      imports: [PerfilPublico],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: TrabajadoresService, useValue: trabajadores },
        { provide: ActivatedRoute, useValue: ruta },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PerfilPublico);
    await fixture.whenStable();
    const componente = fixture.componentInstance as any;
    componente.trabajador.set(PERFIL);
    componente.cargando.set(false);
    fixture.detectChanges();
    return { componente, fixture, trabajadores };
  }

  it('muestra horarios, trabajos, precios y opiniones vacías', async () => {
    const { fixture } = await crearComponente();
    const texto = fixture.nativeElement.textContent;

    expect(texto).toContain('Lunes a sábado');
    expect(texto).toContain('Trabajos realizados');
    expect(texto).toContain('12 trabajo(s) completados');
    expect(texto).toContain('Bs 80,00');
    expect(texto).toContain('Opiniones');
    expect(texto).toContain('Aún no hay opiniones');
  });

  it('no muestra documentos ni datos privados', async () => {
    const { fixture } = await crearComponente();
    const texto = fixture.nativeElement.textContent;

    expect(texto).not.toContain('Carnet');
    expect(texto).not.toContain('REJAP');
    expect(texto).not.toContain('Cuenta bancaria');
  });
});
