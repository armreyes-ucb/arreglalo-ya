import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import type { OfertaConTrabajador, Pago, SolicitudDetalle, Zona } from '../../core/models';
import { PagosService } from '../../core/pagos.service';
import { SolicitudesService } from '../../core/solicitudes.service';
import { ToastService } from '../../core/toast.service';
import { DetalleSolicitud } from './detalle-solicitud';

const ZONA: Zona = {
  id: 1,
  nombre: 'Centro',
  otb: 'OTB Centro',
  municipio: 'Cercado',
  zonas_vecinas: [],
  activa: true,
};

const DETALLE: SolicitudDetalle = {
  id: 'solicitud-1',
  cliente_id: 'cliente-1',
  trabajador_confirmado_id: null,
  zona_id: 1,
  zona: ZONA,
  especialidad: 'PLOMERIA',
  tipo_problema: 'Fuga de agua',
  descripcion: 'Fuga debajo del lavamanos',
  fotos_urls: [],
  direccion_oculta: null,
  whatsapp_url: null,
  fecha_cita_preferida: '2030-01-01T10:00:00.000Z',
  urgente: false,
  estado: 'CON_OFERTAS',
  creada_en: '2026-11-10T10:00:00.000Z',
  vence_en: '2026-12-10T10:00:00.000Z',
  entro_al_tope: null,
  cerrada_en: null,
  total_ofertas: 2,
  advertir_cliente_conflictivo: false,
  historial: [],
};

const PAGO: Pago = {
  id: 'pago-1',
  solicitud_id: 'solicitud-1',
  precio_total_acordado: 400,
  pago_inicial_25: 100,
  parte_trabajador_20: 80,
  comision_5: 20,
  saldo_75: 300,
  codigo_qr_data: 'data:image/png;base64,abc',
  qr_vence_en: '2030-01-01T11:00:00.000Z',
  estado_qr: 'PENDIENTE',
  ya_pague_cliente: false,
  fecha_ya_pague: null,
  saldo_75_confirmado_trabajador: false,
  fecha_confirmacion_trabajador: null,
  transferido_al_trabajador: false,
  comprobante_transferencia: null,
};

function crearOferta(
  id: string,
  precio: number,
  transporte: number,
  promedio: number,
): OfertaConTrabajador {
  return {
    id,
    solicitud_id: 'solicitud-1',
    trabajador_id: `trabajador-${id}`,
    precio_estimado: precio,
    costo_transporte: transporte,
    fecha_propuesta: '2030-01-01T10:00:00.000Z',
    mensaje: null,
    estado: 'ENVIADA',
    fuera_de_zona: false,
    distancia_zona: 0,
    justificacion_fuera_zona: null,
    creada_en: '2026-11-10T10:00:00.000Z',
    trabajador: {
      id: `trabajador-${id}`,
      nombre_completo: `Técnico ${id}`,
      promedio,
      trabajos_completados: 10,
      nivel_verificacion: 2,
      especialidades: ['PLOMERIA'],
      zonas: [ZONA],
    },
  };
}

const OFERTA_BARATA = crearOferta('barata', 150, 5, 4.2);
const OFERTA_CARA = crearOferta('cara', 300, 10, 4.9);

describe('DetalleSolicitud', () => {
  async function crearComponente(estado = 'CON_OFERTAS') {
    const pagoActual = { ...PAGO };
    const solicitudes = {
      detalle: vi.fn().mockResolvedValue({ ...DETALLE, estado }),
      ofertas: vi.fn().mockResolvedValue([OFERTA_CARA, OFERTA_BARATA]),
      pago: vi.fn().mockImplementation(() =>
        Promise.resolve({
          pago: { ...pagoActual },
          reporte_abierto: null,
        }),
      ),
      elegirOferta: vi.fn().mockResolvedValue({ ...pagoActual }),
    };
    const pagos = {
      confirmarPago: vi.fn().mockImplementation(() => {
        pagoActual.estado_qr = 'PAGADO';
        return Promise.resolve({ ...pagoActual });
      }),
    };
    const toast = {
      exito: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DetalleSolicitud],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'solicitud-1',
              },
            },
          },
        },
        { provide: SolicitudesService, useValue: solicitudes },
        { provide: PagosService, useValue: pagos },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DetalleSolicitud);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return {
      componente: fixture.componentInstance as any,
      solicitudes,
      pagos,
      toast,
      fixture,
    };
  }

  it('ordena las ofertas por precio y por reputación', async () => {
    const { componente, fixture } = await crearComponente();

    expect(componente.ofertas()).toHaveLength(2);
    expect(componente.ofertasOrdenadas()[0].id).toBe(OFERTA_BARATA.id);

    componente.orden.set('reputacion');

    expect(componente.ofertasOrdenadas()[0].id).toBe(OFERTA_CARA.id);
    fixture.destroy();
  });

  it('elige la oferta y abre el QR del 25%', async () => {
    const { componente, solicitudes, toast, fixture } = await crearComponente();

    componente.elegir(OFERTA_BARATA);
    expect(componente.ofertaElegida().id).toBe(OFERTA_BARATA.id);

    await componente.confirmarEleccion();

    expect(solicitudes.elegirOferta).toHaveBeenCalledWith('solicitud-1', OFERTA_BARATA.id);
    expect(componente.mostrarQr()).toBe(true);
    expect(toast.exito).toHaveBeenCalled();
    fixture.destroy();
  });

  it('simula la confirmación bancaria del pago', async () => {
    const { componente, pagos, toast, fixture } = await crearComponente('PENDIENTE_PAGO');

    await componente.simularPago();

    expect(pagos.confirmarPago).toHaveBeenCalledWith('pago-1');
    expect(componente.pago().estado_qr).toBe('PAGADO');
    expect(toast.exito).toHaveBeenCalledWith(expect.stringContaining('Pago del 25% confirmado'));
    fixture.destroy();
  });
});
