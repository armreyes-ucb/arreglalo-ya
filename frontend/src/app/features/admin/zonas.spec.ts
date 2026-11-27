import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CoberturaZona, ZonaAdmin } from '../../core/models';
import { AdminService } from '../../core/admin.service';
import { ToastService } from '../../core/toast.service';
import { ZonasAdmin } from './zonas';

const ZONA: ZonaAdmin = {
  id: 1,
  nombre: 'Centro',
  otb: 'OTB Centro',
  municipio: 'Cercado',
  zonas_vecinas: ['Norte'],
  activa: true,
  trabajadores_asignados: 2,
  solicitudes_abiertas: 3,
};

const COBERTURA: CoberturaZona = {
  zona: ZONA,
  asignados: 2,
  total_cubren: 3,
  trabajadores: [
    {
      id: 'perfil-1',
      nombre_completo: 'Ana Pérez',
      estado: 'ACTIVO',
      nivel_verificacion: 3,
      promedio: 4.8,
      trabajos_completados: 12,
      especialidades: ['PLOMERIA'],
      distancia: 2,
      motivo: 'ZONA_VECINA',
    },
  ],
};

describe('ZonasAdmin', () => {
  let admin: {
    listarZonas: ReturnType<typeof vi.fn>;
    cambiarEstadoZona: ReturnType<typeof vi.fn>;
    coberturaZona: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    admin = {
      listarZonas: vi.fn().mockResolvedValue([ZONA]),
      cambiarEstadoZona: vi.fn().mockResolvedValue({ ...ZONA, activa: false }),
      coberturaZona: vi.fn().mockResolvedValue(COBERTURA),
    };

    void TestBed.configureTestingModule({
      imports: [ZonasAdmin],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AdminService, useValue: admin },
        {
          provide: ToastService,
          useValue: { exito: vi.fn(), error: vi.fn(), info: vi.fn() },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function crearComponente() {
    const fixture = TestBed.createComponent(ZonasAdmin);
    await fixture.whenStable();
    return fixture.componentInstance as any;
  }

  it('carga los conteos de la zona', async () => {
    const componente = await crearComponente();

    expect(componente.zonas()).toEqual([ZONA]);
  });

  it('desactiva una zona conservando el historial', async () => {
    const componente = await crearComponente();

    await componente.cambiarEstado(ZONA);

    expect(admin.cambiarEstadoZona).toHaveBeenCalledWith(1, false);
    expect(componente.zonas()[0].activa).toBe(false);
  });

  it('consulta la cobertura por zona', async () => {
    const componente = await crearComponente();

    await componente.verCobertura(ZONA);

    expect(admin.coberturaZona).toHaveBeenCalledWith(1);
    expect(componente.cobertura().total_cubren).toBe(3);
    expect(componente.etiquetaMotivo('ZONA_VECINA')).toBe('Zona vecina');
  });
});
