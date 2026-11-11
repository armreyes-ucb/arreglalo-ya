import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type {
  PerfilTrabajadorPropio,
  SolicitudDisponible,
  Zona,
} from '../../core/models';
import { SolicitudesService } from '../../core/solicitudes.service';
import { ToastService } from '../../core/toast.service';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { ZonasService } from '../../core/zonas.service';
import { TrabajosDisponibles } from './trabajos';

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
  precios_estimados: {},
  promedio: 4.8,
  trabajos_completados: 12,
  estado: 'ACTIVO',
  nivel_verificacion: 3,
  acepto_contrato_digital: true,
  zonas: [ZONA],
  fotos_trabajos: [],
  vence_antecedentes: '2027-01-01',
  antecedentes_por_vencer: false,
  antecedentes_vencidos: false,
  puede_ofertar: true,
  motivo_bloqueo: null,
};

const SOLICITUD: SolicitudDisponible = {
  id: 'solicitud-1',
  zona_id: 1,
  zona: ZONA,
  especialidad: 'PLOMERIA',
  tipo_problema: 'Fuga de agua',
  descripcion: 'Fuga debajo del lavamanos',
  fotos_urls: [],
  fecha_cita_preferida: '2030-01-01T10:00:00.000Z',
  urgente: true,
  estado: 'PUBLICADA',
  creada_en: '2026-11-10T10:00:00.000Z',
  vence_en: '2026-12-10T10:00:00.000Z',
  cliente_en_conflictivos: false,
};

describe('TrabajosDisponibles', () => {
  async function crearComponente() {
    const solicitudes = {
      disponibles: vi.fn().mockResolvedValue([SOLICITUD]),
      ofertar: vi.fn().mockResolvedValue({}),
    };
    const trabajadores = {
      perfilPropio: vi.fn().mockResolvedValue(PERFIL),
    };
    const zonas = { listar: vi.fn().mockResolvedValue([ZONA]) };
    const toast = {
      info: vi.fn(),
      exito: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TrabajosDisponibles],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: SolicitudesService, useValue: solicitudes },
        { provide: TrabajadoresService, useValue: trabajadores },
        { provide: ZonasService, useValue: zonas },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TrabajosDisponibles);
    await fixture.whenStable();
    return {
      componente: fixture.componentInstance as any,
      solicitudes,
      toast,
    };
  }

  it('bloquea la oferta si faltan precio o fecha válidos', async () => {
    const { componente, solicitudes } = await crearComponente();
    componente.seleccionada.set(SOLICITUD);
    componente.oferta.patchValue({
      precio_estimado: 0,
      costo_transporte: 0,
      fecha_propuesta: '2030-01-01T10:00',
      mensaje: '',
    });

    await componente.enviarOferta();

    expect(componente.errorOferta()).toContain('Completa');
    expect(solicitudes.ofertar).not.toHaveBeenCalled();
  });

  it('envía precio, transporte, fecha y mensaje de la oferta', async () => {
    const { componente, solicitudes, toast } = await crearComponente();
    componente.seleccionada.set(SOLICITUD);
    componente.oferta.patchValue({
      precio_estimado: 100,
      costo_transporte: 10,
      fecha_propuesta: '2030-01-01T10:00',
      mensaje: 'Puedo ir mañana',
    });

    await componente.enviarOferta();

    expect(solicitudes.ofertar).toHaveBeenCalledWith(
      'solicitud-1',
      {
        precio_estimado: 100,
        costo_transporte: 10,
        fecha_propuesta: new Date(
          '2030-01-01T10:00',
        ).toISOString(),
        mensaje: 'Puedo ir mañana',
      },
    );
    expect(componente.ofertadas()).toContain('solicitud-1');
    expect(toast.exito).toHaveBeenCalled();
  });
});
