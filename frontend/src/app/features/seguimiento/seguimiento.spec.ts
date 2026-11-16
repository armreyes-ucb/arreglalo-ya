import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  Pago,
  Precio,
  ReportePublico,
  SolicitudDetalle,
  Zona,
} from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { PagosService } from '../../core/pagos.service';
import { SolicitudesService } from '../../core/solicitudes.service';
import { ToastService } from '../../core/toast.service';
import { UploadsService } from '../../core/uploads.service';
import { Seguimiento } from './seguimiento';

const ZONA: Zona = {
  id: 1,
  nombre: 'Centro',
  otb: 'OTB Centro',
  municipio: 'Cercado',
  zonas_vecinas: [],
};

const DETALLE: SolicitudDetalle = {
  id: 'solicitud-1',
  cliente_id: 'cliente-1',
  trabajador_confirmado_id: 'perfil-1',
  zona_id: 1,
  zona: ZONA,
  especialidad: 'PLOMERIA',
  tipo_problema: 'Fuga de agua',
  descripcion: 'Fuga debajo del lavamanos',
  fotos_urls: [],
  direccion_oculta: 'Calle Falsa 123',
  whatsapp_url: 'https://wa.me/59170000001',
  fecha_cita_preferida: '2030-01-01T10:00:00.000Z',
  urgente: false,
  estado: 'CONFIRMADA',
  creada_en: '2026-11-10T10:00:00.000Z',
  vence_en: '2026-12-10T10:00:00.000Z',
  entro_al_tope: null,
  cerrada_en: null,
  total_ofertas: 1,
  advertir_cliente_conflictivo: false,
  historial: [
    {
      estado: 'CONFIRMADA',
      fecha_hora: '2026-11-10T11:00:00.000Z',
      usuario_id: 'cliente-1',
      usuario_nombre: 'Cliente Prueba',
    },
  ],
};

const PAGO: Pago = {
  id: 'pago-1',
  solicitud_id: 'solicitud-1',
  precio_total_acordado: 400,
  pago_inicial_25: 100,
  parte_trabajador_20: 80,
  comision_5: 20,
  saldo_75: 300,
  codigo_qr_data: null,
  qr_vence_en: null,
  estado_qr: 'PAGADO',
  ya_pague_cliente: false,
  fecha_ya_pague: null,
  saldo_75_confirmado_trabajador: false,
  fecha_confirmacion_trabajador: null,
  transferido_al_trabajador: false,
  comprobante_transferencia: null,
};

const PRECIO_FINAL: Precio = {
  id: 'precio-final-1',
  solicitud_id: 'solicitud-1',
  tipo: 'FINAL',
  monto: 420,
  motivo: null,
  foto_evidencia_url: null,
  aprobado_cliente: null,
  fecha: '2026-11-10T12:00:00.000Z',
};

describe('Seguimiento', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  async function crearComponente(opciones: {
    rol?: 'CLIENTE' | 'TRABAJADOR';
    estado?: SolicitudDetalle['estado'];
    precios?: Precio[];
    pago?: Pago | null;
    reporte?: ReportePublico | null;
  } = {}) {
    const {
      rol = 'TRABAJADOR',
      estado = 'CONFIRMADA',
      precios = [],
      pago = { ...PAGO },
      reporte = null,
    } = opciones;

    const solicitudes = {
      detalle: vi
        .fn()
        .mockResolvedValue({ ...DETALLE, estado }),
      pago: vi.fn().mockResolvedValue({
        pago: pago ? { ...pago } : null,
        reporte_abierto: reporte,
      }),
      precios: vi.fn().mockResolvedValue(precios),
      registrarPrecioFinal: vi.fn().mockResolvedValue({}),
      responderPrecioFinal: vi.fn().mockResolvedValue({}),
      registrarIncremento: vi.fn().mockResolvedValue({}),
      responderIncremento: vi.fn().mockResolvedValue({}),
      terminar: vi.fn().mockResolvedValue({}),
      cancelar: vi.fn().mockResolvedValue({
        solicitud: { ...DETALLE, estado: 'CANCELADA' },
        pago: null,
        devolucion: null,
        suspension: null,
        transferencia: null,
      }),
    };
    const pagos = {
      confirmarPago: vi.fn(),
      marcarYaPague: vi.fn().mockResolvedValue({}),
      confirmarPago75: vi.fn().mockResolvedValue({
        pago: { ...PAGO },
        estado_solicitud: 'TERMINADA_TRABAJADOR',
        transferencia: null,
        reporte: { id: 'reclamo-1', estado: 'ABIERTO' },
      }),
    };
    const auth = {
      usuario: () => ({ id: 'usuario-1' }),
      rolActivo: () => rol,
    };
    const toast = {
      exito: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };
    const uploads = {
      subirImagen: vi.fn().mockResolvedValue('/uploads/foto.png'),
    };

    await TestBed.configureTestingModule({
      imports: [Seguimiento],
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
        { provide: AuthService, useValue: auth },
        { provide: SolicitudesService, useValue: solicitudes },
        { provide: PagosService, useValue: pagos },
        { provide: ToastService, useValue: toast },
        { provide: UploadsService, useValue: uploads },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Seguimiento);
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

  it('precarga el precio final con el monto acordado para el técnico', async () => {
    const { componente, solicitudes, fixture } =
      await crearComponente({ rol: 'TRABAJADOR' });

    expect(componente.puedeRegistrarPrecioFinal()).toBe(true);
    expect(componente.formPrecioFinal.value.monto).toBe(400);

    await componente.registrarPrecioFinal();

    expect(solicitudes.registrarPrecioFinal).toHaveBeenCalledWith(
      'solicitud-1',
      { monto: 400 },
    );
    fixture.destroy();
  });

  it('permite al cliente aprobar el precio final pendiente', async () => {
    const { componente, solicitudes, fixture } =
      await crearComponente({
        rol: 'CLIENTE',
        precios: [{ ...PRECIO_FINAL }],
      });

    expect(componente.puedeResponderPrecioFinal()).toBe(true);
    expect(componente.precioFinal().monto).toBe(420);

    await componente.responderPrecioFinal(true);

    expect(solicitudes.responderPrecioFinal).toHaveBeenCalledWith(
      'solicitud-1',
      true,
    );
    fixture.destroy();
  });

  it('reporta el impago como reclamo en revisión y bloquea la transferencia', async () => {
    const { componente, pagos, toast, fixture } =
      await crearComponente({
        rol: 'TRABAJADOR',
        estado: 'TERMINADA_TRABAJADOR',
      });

    expect(componente.puedeConfirmarCobro()).toBe(true);

    componente.formImpago.setValue({
      motivo: 'El cliente no pagó el saldo',
    });
    await componente.reportarImpago();

    expect(pagos.confirmarPago75).toHaveBeenCalledWith(
      'pago-1',
      false,
      'El cliente no pagó el saldo',
    );
    expect(toast.info).toHaveBeenCalledWith(
      'Reclamo abierto. En revisión por supervisor.',
    );
    fixture.destroy();
  });

  it('muestra el reclamo abierto que devuelve el backend', async () => {
    const { componente, fixture } = await crearComponente({
      rol: 'CLIENTE',
      estado: 'TERMINADA_TRABAJADOR',
      reporte: { id: 'reclamo-1', estado: 'ABIERTO' },
    });

    expect(componente.reporte()).toEqual({
      id: 'reclamo-1',
      estado: 'ABIERTO',
    });
    expect(componente.puedeYaPague()).toBe(true);
    fixture.destroy();
  });

  it('actualiza con polling cada 15 segundos y limpia el intervalo al destruir', async () => {
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval'],
    });
    const { solicitudes, fixture } = await crearComponente({
      rol: 'CLIENTE',
    });

    expect(solicitudes.detalle).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(15_000);
    expect(solicitudes.detalle).toHaveBeenCalledTimes(2);

    fixture.destroy();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(solicitudes.detalle).toHaveBeenCalledTimes(2);
  });
});
