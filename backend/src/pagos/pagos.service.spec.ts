import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource } from 'typeorm';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { EstadoOferta } from '../common/enums/estado-oferta.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoReclamo } from '../common/enums/estado-reclamo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { CONFIGURACION_POR_DEFECTO } from '../configuracion/configuracion.constants.js';
import type { ConfiguracionPlataforma } from '../configuracion/interfaces/configuracion-plataforma.interface.js';
import type { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import type { ConflictivosService } from '../reputacion/conflictivos.service.js';
import { PagosService } from './pagos.service.js';

const PAGO_ID = '77777777-7777-4777-8777-777777777777';
const SOLICITUD_ID = '44444444-4444-4444-8444-444444444444';
const CLIENTE_ID = '33333333-3333-4333-8333-333333333333';
const PERFIL_ID = '22222222-2222-4222-8222-222222222222';
const USUARIO_TRABAJADOR = '11111111-1111-4111-8111-111111111111';
const OFERTA_ID = '66666666-6666-4666-8666-666666666666';

function crearSolicitud(
  overrides: Partial<Solicitud> = {},
): Solicitud {
  return {
    id: SOLICITUD_ID,
    clienteId: CLIENTE_ID,
    trabajadorConfirmadoId: null,
    zonaId: 3,
    especialidad: EspecialidadTipo.PLOMERIA,
    tipoProblema: 'Fuga',
    descripcion: 'Fuga de agua',
    fotosUrls: [],
    direccionOculta: 'Calle Secreta 123',
    fechaCitaPreferida: new Date('2026-11-12T10:00:00.000Z'),
    urgente: false,
    estado: EstadoSolicitud.PENDIENTE_PAGO,
    creadaEn: new Date(),
    venceEn: new Date('2026-12-09T10:00:00.000Z'),
    entroAlTope: null,
    cerradaEn: null,
    ...overrides,
  };
}

function crearOferta(): Oferta {
  return {
    id: OFERTA_ID,
    solicitudId: SOLICITUD_ID,
    trabajadorId: PERFIL_ID,
    precioEstimado: 400,
    costoTransporte: 10,
    fechaPropuesta: new Date('2026-11-12T10:00:00.000Z'),
    mensaje: null,
    estado: EstadoOferta.ELEGIDA,
    creadaEn: new Date(),
  };
}

function crearPago(overrides: Partial<Pago> = {}): Pago {
  return {
    id: PAGO_ID,
    solicitudId: SOLICITUD_ID,
    precioTotalAcordado: 400,
    pagoInicial25: 100,
    parteTrabajador20: 80,
    comision5: 20,
    saldo75: 300,
    codigoQrData: 'data:image/png;base64,abc',
    qrVenceEn: new Date(Date.now() + 30 * 60_000),
    estadoQr: EstadoQr.PENDIENTE,
    yaPagueCliente: false,
    fechaYaPague: null,
    saldo75ConfirmadoTrabajador: false,
    fechaConfirmacionTrabajador: null,
    transferidoAlTrabajador: false,
    comprobanteTransferencia: null,
    ...overrides,
  };
}

function crearPerfil(): PerfilTrabajador {
  return {
    id: PERFIL_ID,
    usuarioId: USUARIO_TRABAJADOR,
    especialidades: [EspecialidadTipo.PLOMERIA],
    horarios: null,
    preciosEstimados: {},
    nivelVerificacion: 3,
    promedio: 4.5,
    trabajosCompletados: 10,
    aceptoContratoDigital: true,
    estado: 'ACTIVO',
    fechaPausa: null,
    venceAntecedentes: '2027-01-01',
  } as unknown as PerfilTrabajador;
}

describe('PagosService', () => {
  let manager: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let dataSource: {
    transaction: ReturnType<typeof vi.fn>;
    getRepository: ReturnType<typeof vi.fn>;
  };
  let candidatasRepository: { find: ReturnType<typeof vi.fn> };
  let configuracion: ConfiguracionPlataforma;
  let service: PagosService;

  beforeEach(() => {
    configuracion = { ...CONFIGURACION_POR_DEFECTO };
    manager = {
      findOne: vi.fn(),
      create: vi.fn((_entidad, datos) => ({ ...datos })),
      save: vi.fn(async (_entidad, datos) => {
        if (!datos.id) {
          datos.id = PAGO_ID;
        }
        return datos;
      }),
      update: vi.fn(),
    };
    candidatasRepository = { find: vi.fn() };
    dataSource = {
      transaction: vi.fn(async (callback) => callback(manager)),
      getRepository: vi.fn(() => candidatasRepository),
    };
    service = new PagosService(
      dataSource as unknown as DataSource,
      new BusinessRulesService(),
      {
        get: () => ({ ...configuracion }),
      } as unknown as ConfiguracionService,
      {
        refrescarCliente: vi.fn(async () => undefined),
      } as unknown as ConflictivosService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('CP36: genera el QR del 25% con vencimiento a 30 minutos', async () => {
    manager.findOne.mockResolvedValue(null);
    const antes = Date.now();
    const oferta = crearOferta();
    oferta.estado = EstadoOferta.ENVIADA;

    const pago = await service.crearPagoInicial(
      manager,
      crearSolicitud(),
      oferta,
    );

    expect(pago.pagoInicial25).toBe(100);
    expect(pago.parteTrabajador20).toBe(80);
    expect(pago.comision5).toBe(20);
    expect(pago.saldo75).toBe(300);
    expect(pago.estadoQr).toBe(EstadoQr.PENDIENTE);
    expect(pago.codigoQrData).toMatch(
      /^data:image\/png;base64,/,
    );
    expect(pago.qrVenceEn?.getTime()).toBeGreaterThanOrEqual(
      antes + 29 * 60_000,
    );
  });

  it('CP36: genera un QR nuevo cuando el anterior ya venció', async () => {
    const pago = crearPago({
      qrVenceEn: new Date(Date.now() - 60_000),
      codigoQrData: 'data:image/png;base64,anterior',
    });
    manager.findOne.mockResolvedValue(pago);
    const antes = Date.now();

    const actualizado = await service.crearPagoInicial(
      manager,
      crearSolicitud(),
      crearOferta(),
    );

    expect(actualizado.id).toBe(PAGO_ID);
    expect(actualizado.estadoQr).toBe(EstadoQr.PENDIENTE);
    expect(actualizado.codigoQrData).toMatch(
      /^data:image\/png;base64,/,
    );
    expect(actualizado.codigoQrData).not.toBe(
      'data:image/png;base64,anterior',
    );
    expect(actualizado.qrVenceEn?.getTime()).toBeGreaterThanOrEqual(
      antes + 29 * 60_000,
    );
  });

  it('CP35: un cambio de comisión no altera los montos ya generados', async () => {
    const pago = crearPago({
      qrVenceEn: new Date(Date.now() - 60_000),
    });
    manager.findOne.mockResolvedValue(pago);
    configuracion = {
      ...configuracion,
      comision_pct: 6,
      pago_inicial_pct: 25,
    };

    const renovado = await service.crearPagoInicial(
      manager,
      crearSolicitud(),
      crearOferta(),
    );

    expect(renovado.precioTotalAcordado).toBe(400);
    expect(renovado.pagoInicial25).toBe(100);
    expect(renovado.comision5).toBe(20);
    expect(renovado.parteTrabajador20).toBe(80);

    manager.findOne.mockResolvedValue(null);
    const nuevo = await service.crearPagoInicial(
      manager,
      crearSolicitud({ id: '99999999-9999-4999-8999-999999999999' }),
      crearOferta(),
    );
    expect(nuevo.precioTotalAcordado).toBe(400);
    expect(nuevo.pagoInicial25).toBe(100);
    expect(nuevo.comision5).toBe(24);
  });

  it('CP36: no regenera el QR mientras el vigente no ha vencido', async () => {
    manager.findOne.mockResolvedValue(crearPago());

    await expect(
      service.crearPagoInicial(
        manager,
        crearSolicitud(),
        crearOferta(),
      ),
    ).rejects.toThrow('El QR vigente todavía no ha vencido');
  });

  it('CP28: confirma el pago, asigna trabajador y cierra las demás ofertas', async () => {
    const pago = crearPago();
    const solicitud = crearSolicitud();
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      if (entidad === Oferta) {
        return Promise.resolve(crearOferta());
      }
      return Promise.resolve(null);
    });

    const resultado = await service.confirmarPago(
      CLIENTE_ID,
      PAGO_ID,
    );

    expect(resultado.estado_qr).toBe(EstadoQr.PAGADO);
    expect(solicitud.estado).toBe(EstadoSolicitud.CONFIRMADA);
    expect(solicitud.trabajadorConfirmadoId).toBe(PERFIL_ID);
    expect(manager.update).toHaveBeenCalledWith(
      Oferta,
      {
        solicitudId: SOLICITUD_ID,
        estado: EstadoOferta.ENVIADA,
      },
      { estado: EstadoOferta.CERRADA },
    );
    expect(manager.save).toHaveBeenCalledWith(
      HistorialEstado,
      expect.objectContaining({
        estado: EstadoSolicitud.CONFIRMADA,
      }),
    );
  });

  it('es idempotente si el pago ya fue confirmado', async () => {
    const pago = crearPago({ estadoQr: EstadoQr.PAGADO });
    manager.findOne.mockImplementation((entidad) =>
      Promise.resolve(
        entidad === Pago
          ? pago
          : entidad === Solicitud
            ? crearSolicitud({
                estado: EstadoSolicitud.CONFIRMADA,
              })
            : null,
      ),
    );

    const resultado = await service.confirmarPago(
      CLIENTE_ID,
      PAGO_ID,
    );

    expect(resultado.estado_qr).toBe(EstadoQr.PAGADO);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rechaza la confirmación de un QR vencido', async () => {
    const pago = crearPago({
      qrVenceEn: new Date(Date.now() - 60_000),
    });
    manager.findOne.mockImplementation((entidad) =>
      Promise.resolve(
        entidad === Pago
          ? pago
          : entidad === Solicitud
            ? crearSolicitud()
            : null,
      ),
    );

    await expect(
      service.confirmarPago(CLIENTE_ID, PAGO_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(pago.estadoQr).toBe(EstadoQr.VENCIDO);
  });

  it('registra una devolución por el 25% con 3 días hábiles', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 9, 10, 0, 0));
    manager.findOne.mockResolvedValue(null);

    const devolucion = await service.registrarDevolucion(
      manager,
      crearPago(),
      'Rechazo del precio final',
    );

    expect(devolucion.monto).toBe(100);
    expect(devolucion.fechaLimite).toBe('2026-01-14');
    expect(manager.save).toHaveBeenCalledWith(
      Devolucion,
      expect.objectContaining({
        pagoId: PAGO_ID,
      }),
    );
  });

  it('CP30: confirma el 75%, finaliza y transfiere Bs 80 con comisión de Bs 20', async () => {
    const perfil = crearPerfil();
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({
      estadoQr: EstadoQr.PAGADO,
      yaPagueCliente: true,
      fechaYaPague: new Date(),
    });
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === PerfilTrabajador) {
        return Promise.resolve(perfil);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      return Promise.resolve(null);
    });

    const resultado = await service.confirmarPago75(
      USUARIO_TRABAJADOR,
      PAGO_ID,
      { confirmado: true },
    );

    expect(resultado.estado_solicitud).toBe(
      EstadoSolicitud.FINALIZADA,
    );
    expect(resultado.transferencia).toEqual(
      expect.objectContaining({
        monto: 80,
        comision_plataforma: 20,
        simulada: true,
      }),
    );
    expect(resultado.transferencia?.comprobante).toMatch(/^SIM-/);
    expect(solicitud.estado).toBe(EstadoSolicitud.FINALIZADA);
    expect(solicitud.cerradaEn).not.toBeNull();
    expect(pago.transferidoAlTrabajador).toBe(true);
    expect(pago.saldo75ConfirmadoTrabajador).toBe(true);
    expect(perfil.trabajosCompletados).toBe(11);
    expect(manager.save).toHaveBeenCalledWith(
      HistorialEstado,
      expect.objectContaining({
        estado: EstadoSolicitud.FINALIZADA,
      }),
    );
  });

  it('CP11: si el trabajador confirma antes, espera la marca del cliente', async () => {
    const perfil = crearPerfil();
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({
      estadoQr: EstadoQr.PAGADO,
      yaPagueCliente: false,
    });
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === PerfilTrabajador) {
        return Promise.resolve(perfil);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      return Promise.resolve(null);
    });

    const esperando = await service.confirmarPago75(
      USUARIO_TRABAJADOR,
      PAGO_ID,
      { confirmado: true },
    );

    expect(esperando.estado_solicitud).toBe(
      EstadoSolicitud.TERMINADA_TRABAJADOR,
    );
    expect(esperando.transferencia).toBeNull();
    expect(pago.saldo75ConfirmadoTrabajador).toBe(true);
    expect(pago.fechaConfirmacionTrabajador).not.toBeNull();

    const final = await service.marcarYaPague(
      CLIENTE_ID,
      PAGO_ID,
    );

    expect(final.estado_solicitud).toBe(
      EstadoSolicitud.FINALIZADA,
    );
    expect(final.transferencia?.monto).toBe(80);
    expect(pago.yaPagueCliente).toBe(true);
  });

  it('CP11: el trabajador confirma después de 48 horas y se finaliza sin marca del cliente', async () => {
    const perfil = crearPerfil();
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({
      estadoQr: EstadoQr.PAGADO,
      yaPagueCliente: false,
    });
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === PerfilTrabajador) {
        return Promise.resolve(perfil);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      if (entidad === HistorialEstado) {
        return Promise.resolve({
          fechaHora: new Date(Date.now() - 49 * 3_600_000),
        });
      }
      return Promise.resolve(null);
    });

    const resultado = await service.confirmarPago75(
      USUARIO_TRABAJADOR,
      PAGO_ID,
      { confirmado: true },
    );

    expect(resultado.estado_solicitud).toBe(
      EstadoSolicitud.FINALIZADA,
    );
    expect(resultado.transferencia?.monto).toBe(80);
    expect(pago.yaPagueCliente).toBe(false);
  });

  it('CP11: el cliente marca ya pagué después de 48 horas y se finaliza', async () => {
    const perfil = crearPerfil();
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({
      estadoQr: EstadoQr.PAGADO,
      yaPagueCliente: false,
    });
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === PerfilTrabajador) {
        return Promise.resolve(perfil);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      if (entidad === HistorialEstado) {
        return Promise.resolve({
          fechaHora: new Date(Date.now() - 49 * 3_600_000),
        });
      }
      return Promise.resolve(null);
    });

    const resultado = await service.marcarYaPague(
      CLIENTE_ID,
      PAGO_ID,
    );

    expect(resultado.estado_solicitud).toBe(
      EstadoSolicitud.FINALIZADA,
    );
    expect(resultado.transferencia?.comprobante).toMatch(/^SIM-/);
    expect(pago.saldo75ConfirmadoTrabajador).toBe(false);
  });

  it('CP31: el reporte del trabajador crea el reclamo e incrementa el contador', async () => {
    const perfil = crearPerfil();
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({ estadoQr: EstadoQr.PAGADO });
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === PerfilTrabajador) {
        return Promise.resolve(perfil);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      return Promise.resolve(null);
    });

    const resultado = await service.confirmarPago75(
      USUARIO_TRABAJADOR,
      PAGO_ID,
      { confirmado: false, motivo: 'El cliente no pagó el saldo' },
    );

    expect(resultado.estado_solicitud).toBe(
      EstadoSolicitud.TERMINADA_TRABAJADOR,
    );
    expect(resultado.transferencia).toBeNull();
    expect(resultado.reporte?.estado).toBe(
      EstadoReclamo.EN_REVISION_SUPERVISOR,
    );
    expect(solicitud.estado).toBe(
      EstadoSolicitud.TERMINADA_TRABAJADOR,
    );
    expect(pago.transferidoAlTrabajador).toBe(false);
    expect(manager.save).toHaveBeenCalledWith(
      Reclamo,
      expect.objectContaining({
        estado: EstadoReclamo.EN_REVISION_SUPERVISOR,
        motivo: 'El cliente no pagó el saldo',
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      ClienteConflictivo,
      expect.objectContaining({ reportesAcumulados: 1 }),
    );
  });

  it('CP31: incrementa los reportes acumulados de un cliente ya conflictivo', async () => {
    const perfil = crearPerfil();
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({ estadoQr: EstadoQr.PAGADO });
    const conflictivo = {
      id: '99999999-9999-4999-8999-999999999999',
      clienteId: CLIENTE_ID,
      reportesAcumulados: 2,
      reportesComprobados: 2,
      reportesPendientes: 0,
      motivo: 'Reporte previo',
      registradoPorId: null,
    } as ClienteConflictivo;
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === PerfilTrabajador) {
        return Promise.resolve(perfil);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      if (entidad === ClienteConflictivo) {
        return Promise.resolve(conflictivo);
      }
      return Promise.resolve(null);
    });

    await service.confirmarPago75(USUARIO_TRABAJADOR, PAGO_ID, {
      confirmado: false,
      motivo: 'Nuevo incumplimiento',
    });

    expect(conflictivo.reportesAcumulados).toBe(3);
    expect(manager.save).toHaveBeenCalledWith(
      ClienteConflictivo,
      conflictivo,
    );
  });

  it('exige motivo cuando el trabajador no confirma el pago', async () => {
    const perfil = crearPerfil();
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({ estadoQr: EstadoQr.PAGADO });
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === PerfilTrabajador) {
        return Promise.resolve(perfil);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      return Promise.resolve(null);
    });

    await expect(
      service.confirmarPago75(USUARIO_TRABAJADOR, PAGO_ID, {
        confirmado: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no permite confirmar el 75% a un trabajador no asignado', async () => {
    const perfil = crearPerfil();
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: 'otro-perfil',
    });
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === PerfilTrabajador) {
        return Promise.resolve(perfil);
      }
      if (entidad === Pago) {
        return Promise.resolve(crearPago());
      }
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      return Promise.resolve(null);
    });

    await expect(
      service.confirmarPago75(USUARIO_TRABAJADOR, PAGO_ID, {
        confirmado: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('CP11: cierra automáticamente a las 48 horas si una parte confirmó', async () => {
    const perfil = crearPerfil();
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({
      estadoQr: EstadoQr.PAGADO,
      yaPagueCliente: true,
    });
    candidatasRepository.find.mockResolvedValue([solicitud]);
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === HistorialEstado) {
        return Promise.resolve({
          fechaHora: new Date(Date.now() - 49 * 3_600_000),
        });
      }
      if (entidad === PerfilTrabajador) {
        return Promise.resolve(perfil);
      }
      return Promise.resolve(null);
    });

    const cerradas = await service.cerrarPendientes48h();

    expect(cerradas).toBe(1);
    expect(solicitud.estado).toBe(EstadoSolicitud.FINALIZADA);
    expect(pago.transferidoAlTrabajador).toBe(true);
  });

  it('el cierre automático no actúa con un reclamo abierto', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({
      estadoQr: EstadoQr.PAGADO,
      yaPagueCliente: true,
    });
    candidatasRepository.find.mockResolvedValue([solicitud]);
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === Reclamo) {
        return Promise.resolve({
          id: 'reclamo-1',
          estado: EstadoReclamo.EN_REVISION_SUPERVISOR,
        });
      }
      return Promise.resolve(null);
    });

    const cerradas = await service.cerrarPendientes48h();

    expect(cerradas).toBe(0);
    expect(solicitud.estado).toBe(
      EstadoSolicitud.TERMINADA_TRABAJADOR,
    );
  });

  it('el cierre automático exige que alguna parte haya confirmado', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({ estadoQr: EstadoQr.PAGADO });
    candidatasRepository.find.mockResolvedValue([solicitud]);
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      return Promise.resolve(null);
    });

    const cerradas = await service.cerrarPendientes48h();

    expect(cerradas).toBe(0);
    expect(solicitud.estado).toBe(
      EstadoSolicitud.TERMINADA_TRABAJADOR,
    );
  });

  it('el cierre automático no actúa antes de las 48 horas', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.TERMINADA_TRABAJADOR,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    const pago = crearPago({
      estadoQr: EstadoQr.PAGADO,
      saldo75ConfirmadoTrabajador: true,
    });
    candidatasRepository.find.mockResolvedValue([solicitud]);
    manager.findOne.mockImplementation((entidad) => {
      if (entidad === Solicitud) {
        return Promise.resolve(solicitud);
      }
      if (entidad === Pago) {
        return Promise.resolve(pago);
      }
      if (entidad === HistorialEstado) {
        return Promise.resolve({
          fechaHora: new Date(Date.now() - 47 * 3_600_000),
        });
      }
      return Promise.resolve(null);
    });

    const cerradas = await service.cerrarPendientes48h();

    expect(cerradas).toBe(0);
    expect(solicitud.estado).toBe(
      EstadoSolicitud.TERMINADA_TRABAJADOR,
    );
  });

  it('el cierre automático no toca solicitudes que ya no están terminadas', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.FINALIZADA,
      trabajadorConfirmadoId: PERFIL_ID,
    });
    candidatasRepository.find.mockResolvedValue([solicitud]);
    manager.findOne.mockResolvedValue(solicitud);

    const cerradas = await service.cerrarPendientes48h();

    expect(cerradas).toBe(0);
  });
});
