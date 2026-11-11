import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  PerfilTrabajadorPropio,
  Zona,
} from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { UploadsService } from '../../core/uploads.service';
import { ZonasService } from '../../core/zonas.service';
import { PerfilTrabajador } from './perfil';

const ZONA: Zona = {
  id: 1,
  nombre: 'Centro',
  otb: 'OTB Centro',
  municipio: 'Cercado',
  zonas_vecinas: [],
};

const PERFIL: PerfilTrabajadorPropio = {
  id: 'perfil-1',
  usuario_id: 'usuario-1',
  nombre_completo: 'Ana Pérez',
  telefono: '+59170000001',
  especialidades: ['PLOMERIA'],
  horarios: 'Lunes a sábado',
  precios_estimados: { PLOMERIA: 80 },
  promedio: 4.8,
  trabajos_completados: 12,
  estado: 'ACTIVO',
  nivel_verificacion: 3,
  acepto_contrato_digital: true,
  zonas: [ZONA],
  fotos_trabajos: ['https://fotos/1.jpg'],
  vence_antecedentes: '2027-01-01',
  antecedentes_por_vencer: false,
  antecedentes_vencidos: false,
  puede_ofertar: true,
  motivo_bloqueo: null,
};

describe('PerfilTrabajador', () => {
  async function crearComponente() {
    const trabajadores = {
      perfilPropio: vi.fn().mockResolvedValue(PERFIL),
      actualizarPerfil: vi.fn().mockResolvedValue(PERFIL),
    };
    const zonas = { listar: vi.fn().mockResolvedValue([ZONA]) };
    const uploads = { subirImagen: vi.fn() };
    const toast = {
      info: vi.fn(),
      exito: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PerfilTrabajador],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: TrabajadoresService, useValue: trabajadores },
        { provide: ZonasService, useValue: zonas },
        { provide: UploadsService, useValue: uploads },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PerfilTrabajador);
    await fixture.whenStable();
    return {
      componente: fixture.componentInstance as any,
      trabajadores,
    };
  }

  it('envía fotos y precios vacíos para poder limpiarlos', async () => {
    const { componente, trabajadores } = await crearComponente();
    componente.seleccionadas.set(['PLOMERIA']);
    componente.zonasSeleccionadas.set([1]);
    componente.fotos.set([]);
    componente.formulario.patchValue({
      horarios: 'Lunes a viernes',
      precio_PLOMERIA: '',
    });

    await componente.guardar();

    expect(trabajadores.actualizarPerfil).toHaveBeenCalledWith({
      especialidades: ['PLOMERIA'],
      zonas_ids: [1],
      horarios: 'Lunes a viernes',
      precios_estimados: {},
      fotos_urls: [],
    });
  });

  it('exige al menos una especialidad y una zona', async () => {
    const { componente, trabajadores } = await crearComponente();
    componente.seleccionadas.set([]);
    componente.zonasSeleccionadas.set([1]);

    await componente.guardar();

    expect(componente.error()).toContain('especialidad');
    expect(trabajadores.actualizarPerfil).not.toHaveBeenCalled();
  });
});
