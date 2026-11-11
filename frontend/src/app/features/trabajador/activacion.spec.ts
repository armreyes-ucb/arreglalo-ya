import {
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import type { Zona } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { ZonasService } from '../../core/zonas.service';
import { ActivacionTrabajador } from './activacion';

const ZONAS: Zona[] = [
  {
    id: 1,
    nombre: 'Sopocachi',
    otb: 'OTB Sopocachi',
    municipio: 'La Paz',
    zonas_vecinas: [],
  },
];

describe('ActivacionTrabajador', () => {
  async function crearComponente() {
    const auth = { activarTrabajador: vi.fn() };
    const zonas = { listar: vi.fn().mockResolvedValue(ZONAS) };
    const trabajadores = {
      perfilPropio: vi.fn().mockRejectedValue(new Error('sin perfil')),
    };
    const toast = {
      info: vi.fn(),
      exito: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ActivacionTrabajador],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ZonasService, useValue: zonas },
        {
          provide: TrabajadoresService,
          useValue: trabajadores,
        },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(
      ActivacionTrabajador,
    );
    return {
      componente: fixture.componentInstance as any,
      auth,
      router,
    };
  }

  it('exige al menos una especialidad', async () => {
    const { componente, auth } = await crearComponente();

    await componente.activar();

    expect(componente.error()).toContain('especialidad');
    expect(auth.activarTrabajador).not.toHaveBeenCalled();
  });

  it('exige al menos una zona', async () => {
    const { componente, auth } = await crearComponente();
    componente.seleccionadas.set(['PLOMERIA']);

    await componente.activar();

    expect(componente.error()).toContain('zona');
    expect(auth.activarTrabajador).not.toHaveBeenCalled();
  });

  it('exige leer y aceptar el contrato digital', async () => {
    const { componente, auth } = await crearComponente();
    componente.seleccionadas.set(['PLOMERIA']);
    componente.zonasSeleccionadas.set([1]);
    componente.aceptaContrato.set(true);

    await componente.activar();

    expect(componente.error()).toContain('contrato');
    expect(auth.activarTrabajador).not.toHaveBeenCalled();
  });

  it('habilita la aceptación después de leer el contrato', async () => {
    const { componente } = await crearComponente();

    componente.abrirContrato();
    expect(componente.contratoAbierto()).toBe(true);

    componente.entendidoContrato();
    expect(componente.contratoAbierto()).toBe(false);
    expect(componente.contratoLeido()).toBe(true);
  });

  it('activa el rol y navega a la verificación', async () => {
    const { componente, auth, router } = await crearComponente();
    auth.activarTrabajador.mockResolvedValue({});
    componente.seleccionadas.set(['PLOMERIA', 'ELECTRICIDAD']);
    componente.zonasSeleccionadas.set([1]);
    componente.contratoLeido.set(true);
    componente.aceptaContrato.set(true);

    await componente.activar();

    expect(auth.activarTrabajador).toHaveBeenCalledWith({
      acepto_contrato_digital: true,
      especialidades: ['PLOMERIA', 'ELECTRICIDAD'],
      zonas: [1],
    });
    expect(router.navigate).toHaveBeenCalledWith([
      '/trabajador/verificacion',
    ]);
    expect(componente.guardando()).toBe(false);
  });
});
