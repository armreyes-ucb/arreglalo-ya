import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { PerfilTrabajadorPropio, SolicitudDisponible, Zona } from '../../core/models';
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
  activa: true,
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
  pausa: {
    pausado: false,
    estado: null,
    inicio: null,
    vence_en: null,
    dias_restantes: null,
    aviso: false,
    baja_en: null,
  },
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
  advertir_cliente_conflictivo: false,
  distancia: 0,
  fuera_de_zona: false,
};

describe('TrabajosDisponibles', () => {
  async function crearComponente(solicitud = SOLICITUD) {
    const solicitudes = {
      disponibles: vi.fn().mockResolvedValue([solicitud]),
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

    expect(solicitudes.ofertar).toHaveBeenCalledWith('solicitud-1', {
      precio_estimado: 100,
      costo_transporte: 10,
      fecha_propuesta: new Date('2030-01-01T10:00').toISOString(),
      mensaje: 'Puedo ir mañana',
    });
    expect(componente.ofertadas()).toContain('solicitud-1');
    expect(toast.exito).toHaveBeenCalled();
  });

  it('envía el filtro de fuera de cobertura al actualizar la lista', async () => {
    const { componente, solicitudes } = await crearComponente();
    solicitudes.disponibles.mockClear();
    componente.filtros.patchValue({ incluir_fuera_de_zona: true });

    await componente.buscar();

    expect(solicitudes.disponibles).toHaveBeenCalledWith({
      zona_id: null,
      especialidad: null,
      incluir_fuera_de_zona: true,
    });
  });

  it('exige justificación válida para ofertar fuera de cobertura', async () => {
    const fueraDeZona = {
      ...SOLICITUD,
      id: 'solicitud-2',
      distancia: null,
      fuera_de_zona: true,
    };
    const { componente, solicitudes } = await crearComponente(fueraDeZona);
    componente.seleccionada.set(fueraDeZona);
    componente.oferta.patchValue({
      precio_estimado: 100,
      costo_transporte: 10,
      fecha_propuesta: '2030-01-01T10:00',
      mensaje: '',
      justificacion_fuera_de_zona: ' corta ',
    });

    await componente.enviarOferta();

    expect(componente.errorOferta()).toContain('Justifica');
    expect(solicitudes.ofertar).not.toHaveBeenCalled();

    componente.oferta.patchValue({
      justificacion_fuera_de_zona: '  Puedo desplazarme hasta esa zona sin problema  ',
    });
    await componente.enviarOferta();

    expect(solicitudes.ofertar).toHaveBeenCalledWith('solicitud-2', {
      precio_estimado: 100,
      costo_transporte: 10,
      fecha_propuesta: new Date('2030-01-01T10:00').toISOString(),
      mensaje: undefined,
      justificacion_fuera_de_zona: 'Puedo desplazarme hasta esa zona sin problema',
    });
  });

  it('etiqueta la distancia y el estado fuera de cobertura', async () => {
    const { componente } = await crearComponente();
    expect(componente.etiquetaCobertura(SOLICITUD)).toBe('En tu cobertura');
    expect(componente.etiquetaCobertura({ ...SOLICITUD, distancia: 2 })).toBe('Zona vecina');
    expect(
      componente.etiquetaCobertura({ ...SOLICITUD, distancia: null, fuera_de_zona: true }),
    ).toBe('Fuera de cobertura');
  });
});
