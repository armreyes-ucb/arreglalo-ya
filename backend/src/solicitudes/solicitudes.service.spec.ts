import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoOferta } from '../common/enums/estado-oferta.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { TipoPrecio } from '../common/enums/tipo-precio.enum.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import type { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Pago } from '../entities/pago.entity.js';
import type { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Precio } from '../entities/precio.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import type { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import type { Zona } from '../entities/zona.entity.js';
import type { PagosService } from '../pagos/pagos.service.js';
import type { TrabajadoresService } from '../trabajadores/trabajadores.service.js';
import type { CrearOfertaDto } from './dto/crear-oferta.dto.js';
import type { ElegirOfertaDto } from './dto/elegir-oferta.dto.js';
import type { ListarDisponiblesQueryDto } from './dto/listar-disponibles-query.dto.js';
import type { ResponderPrecioDto } from './dto/responder-precio.dto.js';
import { SolicitudesService } from './solicitudes.service.js';

const USUARIO_ID = '11111111-1111-4111-8111-111111111111';
const PERFIL_ID = '22222222-2222-4222-8222-222222222222';
const CLIENTE_ID = '33333333-3333-4333-8333-333333333333';
const SOLICITUD_ID = '44444444-4444-4444-8444-444444444444';
const OFERTA_ID = '66666666-6666-4666-8666-666666666666';
const PRECIO_ID = '88888888-8888-4888-8888-888888888888';
const DIRECCION = 'Calle Secreta 123';

function crearPerfil(): PerfilTrabajador {
  return {
    id: PERFIL_ID,
    usuarioId: USUARIO_ID,
    especialidades: [EspecialidadTipo.PLOMERIA],
    horarios: null,
    preciosEstimados: {},
    nivelVerificacion: 3,
    promedio: 4.5,
    trabajosCompletados: 10,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.ACTIVO,
    fechaPausa: null,
    venceAntecedentes: '2027-01-01',
    usuario: {
      id: USUARIO_ID,
      nombreCompleto: 'Trabajador Prueba',
      telefono: '+59170000001',
      passwordHash: 'hash',
      roles: [],
      estado: EstadoUsuario.ACTIVO,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      aceptoTerminos: true,
      fechaRegistro: new Date('2026-01-01T00:00:00.000Z'),
      cuentaBancaria: {
        id: '55555555-5555-4555-8555-555555555555',
        usuarioId: USUARIO_ID,
        banco: 'BNB',
        numeroCuentaCifrado: 'cifrado',
        titular: 'Trabajador Prueba',
      },
    },
  } as unknown as PerfilTrabajador;
}

function crearSolicitud(
  overrides: Partial<Solicitud> = {},
): Solicitud {
  const solicitud = {
    id: SOLICITUD_ID,
    clienteId: CLIENTE_ID,
    trabajadorConfirmadoId: null,
    zonaId: 3,
    especialidad: EspecialidadTipo.PLOMERIA,
    tipoProblema: 'Fuga de agua',
    descripcion: 'Fuga debajo del lavamanos de la cocina',
    fotosUrls: ['https://fotos/1.jpg'],
    direccionOculta: DIRECCION,
    fechaCitaPreferida: new Date('2026-11-10T10:00:00.000Z'),
    urgente: false,
    estado: EstadoSolicitud.PUBLICADA,
    creadaEn: new Date('2026-11-09T10:00:00.000Z'),
    venceEn: new Date('2026-12-09T10:00:00.000Z'),
    entroAlTope: null,
    cerradaEn: null,
  } satisfies Solicitud;
  return Object.assign(solicitud, overrides);
}

function crearZona(): Zona {
  return {
    id: 3,
    nombre: 'Centro',
    otb: 'OTB Centro',
    municipio: 'Cercado',
    zonasVecinas: ['Norte'],
  };
}

function crearPago(overrides: Partial<Pago> = {}): Pago {
  return {
    id: '77777777-7777-4777-8777-777777777777',
    solicitudId: SOLICITUD_ID,
    precioTotalAcordado: 400,
    pagoInicial25: 100,
    parteTrabajador20: 80,
    comision5: 20,
    saldo75: 300,
    codigoQrData: 'data:image/png;base64,abc',
    qrVenceEn: new Date('2026-11-09T11:00:00.000Z'),
    estadoQr: EstadoQr.PAGADO,
    yaPagueCliente: false,
    fechaYaPague: null,
    saldo75ConfirmadoTrabajador: false,
    fechaConfirmacionTrabajador: null,
    transferidoAlTrabajador: false,
    comprobanteTransferencia: null,
    ...overrides,
  };
}

function crearOferta(
  overrides: Partial<Oferta> = {},
): Oferta {
  return {
    id: OFERTA_ID,
    solicitudId: SOLICITUD_ID,
    trabajadorId: PERFIL_ID,
    precioEstimado: 400,
    costoTransporte: 10,
    fechaPropuesta: new Date('2026-11-10T10:00:00.000Z'),
    mensaje: null,
    estado: EstadoOferta.ENVIADA,
    creadaEn: new Date('2026-11-09T10:00:00.000Z'),
    ...overrides,
  };
}

describe('SolicitudesService', () => {
  let solicitudRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let ofertaRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  let historialRepository: { find: ReturnType<typeof vi.fn> };
  let conflictivoRepository: { find: ReturnType<typeof vi.fn> };
  let perfilRepository: { findOne: ReturnType<typeof vi.fn> };
  let trabajadorZonaRepository: { find: ReturnType<typeof vi.fn> };
  let zonaRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let trabajadoresService: {
    listarCandidatos: ReturnType<typeof vi.fn>;
  };
  let pagosService: {
    crearPagoInicial: ReturnType<typeof vi.fn>;
    registrarDevolucion: ReturnType<typeof vi.fn>;
  };
  let reglas: BusinessRulesService;
  let manager: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let dataSource: { transaction: ReturnType<typeof vi.fn> };
  let service: SolicitudesService;

  beforeEach(() => {
    solicitudRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
    };
    ofertaRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    };
    historialRepository = { find: vi.fn() };
    conflictivoRepository = { find: vi.fn() };
    perfilRepository = { findOne: vi.fn() };
    trabajadorZonaRepository = { find: vi.fn() };
    zonaRepository = { find: vi.fn(), findOne: vi.fn() };
    trabajadoresService = { listarCandidatos: vi.fn() };
    pagosService = {
      crearPagoInicial: vi.fn(),
      registrarDevolucion: vi.fn(),
    };
    reglas = new BusinessRulesService();
    manager = {
      findOne: vi.fn(),
      create: vi.fn((_entidad, datos) => ({ ...datos })),
      save: vi.fn(async (_entidad, datos) => datos),
      update: vi.fn(),
    };
    dataSource = {
      transaction: vi.fn(async (callback) => callback(manager)),
    };
    service = new SolicitudesService(
      solicitudRepository as unknown as Repository<Solicitud>,
      ofertaRepository as unknown as Repository<Oferta>,
      historialRepository as unknown as Repository<
        import('../entities/historial-estado.entity.js').HistorialEstado
      >,
      conflictivoRepository as unknown as Repository<ClienteConflictivo>,
      perfilRepository as unknown as Repository<PerfilTrabajador>,
      trabajadorZonaRepository as unknown as Repository<TrabajadorZona>,
      zonaRepository as unknown as Repository<Zona>,
      trabajadoresService as unknown as TrabajadoresService,
      pagosService as unknown as PagosService,
      reglas,
      dataSource as unknown as DataSource,
    );
  });

  it('CP14: no expone la dirección oculta en solicitudes disponibles', async () => {
    perfilRepository.findOne.mockResolvedValue(crearPerfil());
    trabajadorZonaRepository.find.mockResolvedValue([
      { trabajadorId: PERFIL_ID, zonaId: 3 } as TrabajadorZona,
    ]);
    solicitudRepository.find.mockResolvedValue([crearSolicitud()]);
    zonaRepository.find.mockResolvedValue([crearZona()]);
    conflictivoRepository.find.mockResolvedValue([
      { clienteId: CLIENTE_ID } as ClienteConflictivo,
    ]);

    const resultado = await service.listarDisponibles(
      USUARIO_ID,
      {} as ListarDisponiblesQueryDto,
    );

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).not.toHaveProperty('direccion_oculta');
    expect(JSON.stringify(resultado)).not.toContain(DIRECCION);
    expect(resultado[0].cliente_en_conflictivos).toBe(true);
  });

  it('CP20: bloquea ofertar en una solicitud propia', async () => {
    perfilRepository.findOne.mockResolvedValue(crearPerfil());
    solicitudRepository.findOne.mockResolvedValue(
      crearSolicitud({ clienteId: USUARIO_ID }),
    );

    await expect(
      service.crearOferta(
        USUARIO_ID,
        SOLICITUD_ID,
        {
          precio_estimado: 100,
          costo_transporte: 10,
          fecha_propuesta: '2026-11-10T10:00:00.000Z',
        } as CrearOfertaDto,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lista las solicitudes propias con su zona', async () => {
    solicitudRepository.find.mockResolvedValue([crearSolicitud()]);
    zonaRepository.find.mockResolvedValue([crearZona()]);

    const resultado = await service.listarMias(CLIENTE_ID);

    expect(resultado).toHaveLength(1);
    expect(solicitudRepository.find).toHaveBeenCalledWith({
      where: { clienteId: CLIENTE_ID },
      order: { creadaEn: 'DESC' },
    });
    expect(resultado[0].direccion_oculta).toBe(DIRECCION);
    expect(resultado[0].zona?.nombre).toBe('Centro');
  });

  it('devuelve el detalle con historial y número de ofertas', async () => {
    solicitudRepository.findOne.mockResolvedValue(crearSolicitud());
    zonaRepository.findOne.mockResolvedValue(crearZona());
    historialRepository.find.mockResolvedValue([
      {
        estado: EstadoSolicitud.PUBLICADA,
        fechaHora: new Date('2026-11-09T10:00:00.000Z'),
        usuarioId: CLIENTE_ID,
        usuario: { nombreCompleto: 'Cliente Prueba' },
      },
    ]);
    ofertaRepository.count.mockResolvedValue(2);

    const resultado = await service.obtenerDetalle(
      CLIENTE_ID,
      SOLICITUD_ID,
    );

    expect(resultado.total_ofertas).toBe(2);
    expect(resultado.historial).toHaveLength(1);
    expect(resultado.historial[0]).toMatchObject({
      estado: EstadoSolicitud.PUBLICADA,
      usuario_nombre: 'Cliente Prueba',
    });
  });

  it('no expone el detalle de una solicitud ajena', async () => {
    solicitudRepository.findOne.mockResolvedValue(crearSolicitud());

    await expect(
      service.obtenerDetalle(USUARIO_ID, SOLICITUD_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lista las ofertas propias con el resumen de la solicitud', async () => {
    perfilRepository.findOne.mockResolvedValue(crearPerfil());
    ofertaRepository.find.mockResolvedValue([
      {
        id: '66666666-6666-4666-8666-666666666666',
        solicitudId: SOLICITUD_ID,
        trabajadorId: PERFIL_ID,
        precioEstimado: 120,
        costoTransporte: 10,
        fechaPropuesta: new Date('2026-11-10T10:00:00.000Z'),
        mensaje: 'Puedo ir mañana',
        estado: 'ENVIADA',
        creadaEn: new Date('2026-11-09T11:00:00.000Z'),
      } as Oferta,
    ]);
    solicitudRepository.find.mockResolvedValue([crearSolicitud()]);
    zonaRepository.find.mockResolvedValue([crearZona()]);

    const resultado = await service.listarMisOfertas(USUARIO_ID);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].solicitud.tipo_problema).toBe('Fuga de agua');
    expect(resultado[0].precio_estimado).toBe(120);
  });

  it('CP01/CP36: elige oferta, genera el 25% y queda PENDIENTE_PAGO', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.CON_OFERTAS,
    });
    const oferta = crearOferta();
    const pago = crearPago({
      estadoQr: EstadoQr.PENDIENTE,
      qrVenceEn: new Date(Date.now() + 30 * 60_000),
    });
    manager.findOne.mockImplementation((entidad) =>
      Promise.resolve(
        entidad === Solicitud
          ? solicitud
          : entidad === Oferta
            ? oferta
            : null,
      ),
    );
    pagosService.crearPagoInicial.mockResolvedValue(pago);

    const resultado = await service.elegirOferta(
      CLIENTE_ID,
      SOLICITUD_ID,
      { oferta_id: OFERTA_ID } as ElegirOfertaDto,
    );

    expect(pagosService.crearPagoInicial).toHaveBeenCalledWith(
      manager,
      solicitud,
      oferta,
    );
    expect(solicitud.estado).toBe(EstadoSolicitud.PENDIENTE_PAGO);
    expect(oferta.estado).toBe(EstadoOferta.ELEGIDA);
    expect(manager.save).toHaveBeenCalledWith(
      Precio,
      expect.objectContaining({
        tipo: TipoPrecio.PREVIO,
        monto: 400,
      }),
    );
    expect(resultado.pago_inicial_25).toBe(100);
  });

  it('no permite cambiar de oferta mientras hay un QR pendiente', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.PENDIENTE_PAGO,
    });
    manager.findOne.mockImplementation((entidad) =>
      Promise.resolve(
        entidad === Solicitud
          ? solicitud
          : entidad === Oferta
            ? crearOferta({ estado: EstadoOferta.ENVIADA })
            : null,
      ),
    );

    await expect(
      service.elegirOferta(CLIENTE_ID, SOLICITUD_ID, {
        oferta_id: OFERTA_ID,
      } as ElegirOfertaDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('CP29: rechazar el precio final anula y programa la devolución del 25%', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.CONFIRMADA,
    });
    const precio = {
      id: PRECIO_ID,
      solicitudId: SOLICITUD_ID,
      tipo: TipoPrecio.FINAL,
      monto: 400,
      motivo: null,
      fotoEvidenciaUrl: null,
      aprobadoCliente: null,
      fecha: new Date(),
    } as Precio;
    const pago = crearPago();
    const devolucion = {
      id: '99999999-9999-4999-8999-999999999999',
      pagoId: pago.id,
      motivo: 'Rechazo del precio final',
      monto: 100,
      fechaLimite: '2026-01-14',
      estado: 'PENDIENTE',
    };
    manager.findOne.mockImplementation((entidad) =>
      Promise.resolve(
        entidad === Solicitud
          ? solicitud
          : entidad === Precio
            ? precio
            : entidad === Pago
              ? pago
              : null,
      ),
    );
    pagosService.registrarDevolucion.mockResolvedValue(devolucion);

    const resultado = await service.responderPrecioFinal(
      CLIENTE_ID,
      SOLICITUD_ID,
      { aprobado: false } as ResponderPrecioDto,
    );

    expect(solicitud.estado).toBe(EstadoSolicitud.ANULADA);
    expect(precio.aprobadoCliente).toBe(false);
    expect(pagosService.registrarDevolucion).toHaveBeenCalledWith(
      manager,
      pago,
      'Rechazo del precio final',
    );
    expect(resultado.devolucion?.monto).toBe(100);
    expect(manager.update).toHaveBeenCalledWith(
      Oferta,
      expect.objectContaining({ solicitudId: SOLICITUD_ID }),
      { estado: EstadoOferta.CERRADA },
    );
  });

  it('permite un precio final igual al 25% y deja saldo cero', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.CONFIRMADA,
    });
    const precio = {
      id: PRECIO_ID,
      solicitudId: SOLICITUD_ID,
      tipo: TipoPrecio.FINAL,
      monto: 100,
      motivo: null,
      fotoEvidenciaUrl: null,
      aprobadoCliente: null,
      fecha: new Date(),
    } as Precio;
    const pago = crearPago();
    manager.findOne.mockImplementation((entidad) =>
      Promise.resolve(
        entidad === Solicitud
          ? solicitud
          : entidad === Precio
            ? precio
            : entidad === Pago
              ? pago
              : null,
      ),
    );

    const resultado = await service.responderPrecioFinal(
      CLIENTE_ID,
      SOLICITUD_ID,
      { aprobado: true } as ResponderPrecioDto,
    );

    expect(solicitud.estado).toBe(EstadoSolicitud.EN_PROGRESO);
    expect(pago.precioTotalAcordado).toBe(100);
    expect(pago.saldo75).toBe(0);
    expect(resultado.pago?.saldo_75).toBe(0);
  });

  it('CP09: rechazar un incremento anula y devuelve el 25%', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.EN_PROGRESO,
    });
    const precio = {
      id: PRECIO_ID,
      solicitudId: SOLICITUD_ID,
      tipo: TipoPrecio.INCREMENTO,
      monto: 80,
      motivo: 'Fuga adicional',
      fotoEvidenciaUrl: '/uploads/imagenes/fuga.jpg',
      aprobadoCliente: null,
      fecha: new Date(),
    } as Precio;
    const pago = crearPago();
    const devolucion = {
      id: '99999999-9999-4999-8999-999999999999',
      pagoId: pago.id,
      motivo: 'Rechazo de incremento',
      monto: 100,
      fechaLimite: '2026-01-14',
      estado: 'PENDIENTE',
    };
    manager.findOne.mockImplementation((entidad) =>
      Promise.resolve(
        entidad === Solicitud
          ? solicitud
          : entidad === Precio
            ? precio
            : entidad === Pago
              ? pago
              : null,
      ),
    );
    pagosService.registrarDevolucion.mockResolvedValue(devolucion);

    const resultado = await service.responderIncremento(
      CLIENTE_ID,
      SOLICITUD_ID,
      PRECIO_ID,
      { aprobado: false } as ResponderPrecioDto,
    );

    expect(solicitud.estado).toBe(EstadoSolicitud.ANULADA);
    expect(precio.aprobadoCliente).toBe(false);
    expect(resultado.devolucion?.monto).toBe(100);
  });

  it('CP33: el trabajador confirmado ve dirección y WhatsApp solo mientras el trabajo está abierto', async () => {
    const solicitud = crearSolicitud({
      estado: EstadoSolicitud.CONFIRMADA,
      trabajadorConfirmadoId: PERFIL_ID,
      cliente: {
        id: CLIENTE_ID,
        nombreCompleto: 'Cliente Prueba',
        telefono: '+59170000002',
      },
    } as unknown as Partial<Solicitud>);
    perfilRepository.findOne.mockResolvedValue(crearPerfil());
    solicitudRepository.findOne.mockResolvedValue(solicitud);
    zonaRepository.findOne.mockResolvedValue(crearZona());
    historialRepository.find.mockResolvedValue([]);
    ofertaRepository.count.mockResolvedValue(1);

    const abierta = await service.obtenerDetalle(
      USUARIO_ID,
      SOLICITUD_ID,
      Rol.TRABAJADOR,
    );

    expect(abierta.direccion_oculta).toBe(DIRECCION);
    expect(abierta.whatsapp_url).toContain('59170000002');

    solicitud.estado = EstadoSolicitud.FINALIZADA;
    const cerrada = await service.obtenerDetalle(
      USUARIO_ID,
      SOLICITUD_ID,
      Rol.TRABAJADOR,
    );

    expect(cerrada.direccion_oculta).toBeNull();
    expect(cerrada.whatsapp_url).toBeNull();
  });

  it('no expone el detalle al trabajador que no fue confirmado', async () => {
    solicitudRepository.findOne.mockResolvedValue(
      crearSolicitud({
        estado: EstadoSolicitud.CONFIRMADA,
        trabajadorConfirmadoId: null,
      }),
    );
    perfilRepository.findOne.mockResolvedValue(crearPerfil());

    await expect(
      service.obtenerDetalle(
        USUARIO_ID,
        SOLICITUD_ID,
        Rol.TRABAJADOR,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
