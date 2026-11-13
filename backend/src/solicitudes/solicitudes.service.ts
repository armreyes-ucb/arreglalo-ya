import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  MoreThan,
  Repository,
  type EntityManager,
} from 'typeorm';
import { EstadoOferta } from '../common/enums/estado-oferta.enum.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { TipoPrecio } from '../common/enums/tipo-precio.enum.js';
import { toDevolucionPublica } from '../common/mappers/devolucion-publica.mapper.js';
import { toOfertaPublica } from '../common/mappers/oferta-publica.mapper.js';
import { toPagoPublico } from '../common/mappers/pago-publico.mapper.js';
import { toPrecioPublico } from '../common/mappers/precio-publico.mapper.js';
import {
  toOfertaConSolicitud,
  toSolicitudDetalle,
} from '../common/mappers/solicitud-detalle.mapper.js';
import { toSolicitudDisponible } from '../common/mappers/solicitud-disponible.mapper.js';
import { toSolicitudPublica } from '../common/mappers/solicitud-publica.mapper.js';
import { BusinessRulesService } from '../common/services/business-rules.service.js';
import { sumarDias } from '../common/utils/fechas.js';
import { evaluarTrabajadorParaOferta } from '../common/utils/rn10.js';
import { generarEnlaceWhatsApp } from '../common/utils/whatsapp.js';
import { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Precio } from '../entities/precio.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Zona } from '../entities/zona.entity.js';
import type { PagoPublico } from '../pagos/interfaces/pago-publico.interface.js';
import { PagosService } from '../pagos/pagos.service.js';
import { TrabajadoresService } from '../trabajadores/trabajadores.service.js';
import type { CrearIncrementoDto } from './dto/crear-incremento.dto.js';
import type { CrearOfertaDto } from './dto/crear-oferta.dto.js';
import type { CrearPrecioFinalDto } from './dto/crear-precio-final.dto.js';
import type { CrearSolicitudDto } from './dto/crear-solicitud.dto.js';
import type { ElegirOfertaDto } from './dto/elegir-oferta.dto.js';
import type { ListarDisponiblesQueryDto } from './dto/listar-disponibles-query.dto.js';
import type { ResponderPrecioDto } from './dto/responder-precio.dto.js';
import type { OfertaConSolicitud } from './interfaces/oferta-con-solicitud.interface.js';
import type { OfertaPublica } from './interfaces/oferta-publica.interface.js';
import type {
  PrecioPublico,
  ResolucionPrecio,
} from './interfaces/precio-publico.interface.js';
import type { SolicitudDetalle } from './interfaces/solicitud-detalle.interface.js';
import type { SolicitudDisponible } from './interfaces/solicitud-disponible.interface.js';
import type { SolicitudPublica } from './interfaces/solicitud-publica.interface.js';

const ESTADOS_CON_CONTACTO = [
  EstadoSolicitud.CONFIRMADA,
  EstadoSolicitud.EN_PROGRESO,
  EstadoSolicitud.TERMINADA_TRABAJADOR,
];

const ESTADOS_TRABAJADOR_ASIGNADO = [
  ...ESTADOS_CON_CONTACTO,
  EstadoSolicitud.FINALIZADA,
  EstadoSolicitud.ANULADA,
  EstadoSolicitud.CANCELADA,
];

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud)
    private readonly solicitudRepository: Repository<Solicitud>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(HistorialEstado)
    private readonly historialRepository: Repository<HistorialEstado>,
    @InjectRepository(ClienteConflictivo)
    private readonly conflictivoRepository: Repository<ClienteConflictivo>,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
    @InjectRepository(TrabajadorZona)
    private readonly trabajadorZonaRepository: Repository<TrabajadorZona>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    private readonly trabajadoresService: TrabajadoresService,
    private readonly pagosService: PagosService,
    private readonly reglas: BusinessRulesService,
    private readonly dataSource: DataSource,
  ) {}

  async crearSolicitud(
    clienteId: string,
    dto: CrearSolicitudDto,
  ): Promise<SolicitudPublica> {
    const zona = await this.zonaRepository.findOne({
      where: { id: dto.zona_id },
    });
    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
    }

    const fechaCita = new Date(dto.fecha_cita_preferida);
    if (fechaCita.getTime() <= Date.now()) {
      throw new BadRequestException(
        'La fecha de cita preferida debe ser futura',
      );
    }

    const ahora = new Date();
    const urgente = dto.urgente ?? false;
    const solicitud = this.solicitudRepository.create({
      clienteId,
      trabajadorConfirmadoId: null,
      zonaId: dto.zona_id,
      especialidad: dto.especialidad,
      tipoProblema: dto.tipo_problema,
      descripcion: dto.descripcion,
      fotosUrls: dto.fotos_urls,
      direccionOculta: dto.direccion_oculta,
      fechaCitaPreferida: fechaCita,
      urgente,
      estado: EstadoSolicitud.PUBLICADA,
      venceEn: sumarDias(ahora, 30),
      entroAlTope: urgente ? ahora : null,
      cerradaEn: null,
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Solicitud, solicitud);
      await this.registrarHistorial(
        manager,
        solicitud.id,
        EstadoSolicitud.PUBLICADA,
        clienteId,
      );
    });

    return toSolicitudPublica(solicitud, zona);
  }

  async listarDisponibles(
    usuarioId: string,
    query: ListarDisponiblesQueryDto,
  ): Promise<SolicitudDisponible[]> {
    const perfil = await this.perfilRepository.findOne({
      where: { usuarioId },
    });
    if (!perfil) {
      throw new NotFoundException(
        'No existe un perfil de trabajador para este usuario',
      );
    }
    if (perfil.especialidades.length === 0) {
      return [];
    }
    if (
      query.especialidad &&
      !perfil.especialidades.includes(query.especialidad)
    ) {
      return [];
    }

    const relaciones = await this.trabajadorZonaRepository.find({
      where: { trabajadorId: perfil.id },
    });
    if (relaciones.length === 0) {
      return [];
    }

    let zonaIds = relaciones.map((relacion) => relacion.zonaId);
    if (query.zona_id !== undefined) {
      if (!zonaIds.includes(query.zona_id)) {
        return [];
      }
      zonaIds = [query.zona_id];
    }

    const especialidades = query.especialidad
      ? [query.especialidad]
      : perfil.especialidades;

    const solicitudes = await this.solicitudRepository.find({
      where: {
        zonaId: In(zonaIds),
        especialidad: In(especialidades),
        estado: In([
          EstadoSolicitud.PUBLICADA,
          EstadoSolicitud.CON_OFERTAS,
        ]),
        venceEn: MoreThan(new Date()),
      },
      order: {
        urgente: 'DESC',
        creadaEn: 'DESC',
      },
    });
    if (solicitudes.length === 0) {
      return [];
    }

    const [zonas, conflictivos] = await Promise.all([
      this.zonaRepository.find({
        where: {
          id: In(solicitudes.map((solicitud) => solicitud.zonaId)),
        },
      }),
      this.conflictivoRepository.find({
        where: {
          clienteId: In([
            ...new Set(solicitudes.map((solicitud) => solicitud.clienteId)),
          ]),
        },
      }),
    ]);
    const zonasPorId = new Map(zonas.map((zona) => [zona.id, zona]));
    const clientesConflictivos = new Set(
      conflictivos.map((conflictivo) => conflictivo.clienteId),
    );

    return solicitudes.map((solicitud) =>
      toSolicitudDisponible(
        solicitud,
        zonasPorId.get(solicitud.zonaId) ?? null,
        clientesConflictivos.has(solicitud.clienteId),
      ),
    );
  }

  async listarMias(clienteId: string): Promise<SolicitudPublica[]> {
    const solicitudes = await this.solicitudRepository.find({
      where: { clienteId },
      order: { creadaEn: 'DESC' },
    });
    if (solicitudes.length === 0) {
      return [];
    }
    const zonas = await this.zonaRepository.find({
      where: {
        id: In([...new Set(solicitudes.map((solicitud) => solicitud.zonaId))]),
      },
    });
    const zonasPorId = new Map(zonas.map((zona) => [zona.id, zona]));
    return solicitudes.map((solicitud) =>
      toSolicitudPublica(
        solicitud,
        zonasPorId.get(solicitud.zonaId) ?? null,
      ),
    );
  }

  async obtenerDetalle(
    usuarioId: string,
    solicitudId: string,
    rolActivo: Rol = Rol.CLIENTE,
  ): Promise<SolicitudDetalle> {
    const solicitud = await this.solicitudRepository.findOne({
      where: { id: solicitudId },
      relations: {
        cliente: true,
        trabajadorConfirmado: {
          usuario: true,
        },
      },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const esCliente = solicitud.clienteId === usuarioId;
    if (!esCliente) {
      if (rolActivo !== Rol.TRABAJADOR) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      const perfil = await this.perfilRepository.findOne({
        where: { usuarioId },
      });
      if (
        !perfil ||
        solicitud.trabajadorConfirmadoId !== perfil.id ||
        !ESTADOS_TRABAJADOR_ASIGNADO.includes(solicitud.estado)
      ) {
        throw new ForbiddenException(
          'No tienes acceso a esta solicitud',
        );
      }
    }

    const [zona, historial, totalOfertas] = await Promise.all([
      this.zonaRepository.findOne({ where: { id: solicitud.zonaId } }),
      this.historialRepository.find({
        where: { solicitudId },
        relations: { usuario: true },
        order: { fechaHora: 'ASC' },
      }),
      this.ofertaRepository.count({ where: { solicitudId } }),
    ]);

    const puedeVerContacto = ESTADOS_CON_CONTACTO.includes(
      solicitud.estado,
    );
    const direccionOculta = esCliente
      ? solicitud.direccionOculta
      : puedeVerContacto
        ? solicitud.direccionOculta
        : null;
    const telefonoContraparte = esCliente
      ? solicitud.trabajadorConfirmado?.usuario?.telefono
      : solicitud.cliente?.telefono;
    const whatsappUrl = puedeVerContacto
      ? generarEnlaceWhatsApp(telefonoContraparte, solicitud.id)
      : null;

    return toSolicitudDetalle(
      solicitud,
      zona,
      historial,
      totalOfertas,
      {
        direccionOculta,
        whatsappUrl,
      },
    );
  }

  async listarMisOfertas(
    usuarioId: string,
  ): Promise<OfertaConSolicitud[]> {
    const perfil = await this.perfilRepository.findOne({
      where: { usuarioId },
    });
    if (!perfil) {
      throw new NotFoundException(
        'No existe un perfil de trabajador para este usuario',
      );
    }

    const ofertas = await this.ofertaRepository.find({
      where: { trabajadorId: perfil.id },
      order: { creadaEn: 'DESC' },
    });
    if (ofertas.length === 0) {
      return [];
    }

    const solicitudes = await this.solicitudRepository.find({
      where: {
        id: In([...new Set(ofertas.map((oferta) => oferta.solicitudId))]),
      },
    });
    const zonas = await this.zonaRepository.find({
      where: {
        id: In([
          ...new Set(solicitudes.map((solicitud) => solicitud.zonaId)),
        ]),
      },
    });
    const solicitudesPorId = new Map(
      solicitudes.map((solicitud) => [solicitud.id, solicitud]),
    );
    const zonasPorId = new Map(zonas.map((zona) => [zona.id, zona]));

    return ofertas.flatMap((oferta) => {
      const solicitud = solicitudesPorId.get(oferta.solicitudId);
      if (!solicitud) {
        return [];
      }
      return [
        toOfertaConSolicitud(
          oferta,
          solicitud,
          zonasPorId.get(solicitud.zonaId) ?? null,
        ),
      ];
    });
  }

  async crearOferta(
    usuarioId: string,
    solicitudId: string,
    dto: CrearOfertaDto,
  ): Promise<OfertaPublica> {
    const perfil = await this.perfilRepository.findOne({
      where: { usuarioId },
      relations: {
        usuario: {
          cuentaBancaria: true,
        },
      },
    });
    if (!perfil || !perfil.usuario) {
      throw new NotFoundException(
        'No existe un perfil de trabajador para este usuario',
      );
    }

    const evaluacion = evaluarTrabajadorParaOferta(
      perfil,
      Boolean(perfil.usuario.cuentaBancaria),
    );
    if (!evaluacion.puedeOfertar) {
      throw new ForbiddenException(
        evaluacion.motivo ?? 'No está habilitado para ofertar',
      );
    }

    const solicitud = await this.solicitudRepository.findOne({
      where: { id: solicitudId },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (solicitud.clienteId === usuarioId) {
      throw new ForbiddenException(
        'No puedes ofertar en tu propia solicitud',
      );
    }
    if (
      solicitud.estado !== EstadoSolicitud.PUBLICADA &&
      solicitud.estado !== EstadoSolicitud.CON_OFERTAS
    ) {
      throw new BadRequestException(
        'La solicitud ya no acepta ofertas',
      );
    }
    if (solicitud.venceEn.getTime() <= Date.now()) {
      throw new BadRequestException('La solicitud está vencida');
    }
    if (!perfil.especialidades.includes(solicitud.especialidad)) {
      throw new ForbiddenException(
        'La especialidad de la solicitud no coincide con tu perfil',
      );
    }

    const candidatos = await this.trabajadoresService.listarCandidatos(
      solicitud.zonaId,
      solicitud.especialidad,
    );
    if (!candidatos.some((candidato) => candidato.id === perfil.id)) {
      throw new ForbiddenException(
        'La solicitud no está disponible en tus zonas de trabajo',
      );
    }

    const existente = await this.ofertaRepository.findOne({
      where: {
        solicitudId,
        trabajadorId: perfil.id,
      },
    });
    if (existente) {
      throw new BadRequestException(
        'Ya enviaste una oferta para esta solicitud',
      );
    }

    const fechaPropuesta = new Date(dto.fecha_propuesta);
    const oferta = this.ofertaRepository.create({
      solicitudId,
      trabajadorId: perfil.id,
      precioEstimado: dto.precio_estimado,
      costoTransporte: dto.costo_transporte,
      fechaPropuesta,
      mensaje: dto.mensaje ?? null,
      estado: EstadoOferta.ENVIADA,
    });

    await this.dataSource.transaction(async (manager) => {
      const solicitudActual = await manager.findOne(Solicitud, {
        where: { id: solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!solicitudActual) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (
        solicitudActual.estado !== EstadoSolicitud.PUBLICADA &&
        solicitudActual.estado !== EstadoSolicitud.CON_OFERTAS
      ) {
        throw new BadRequestException(
          'La solicitud ya no acepta ofertas',
        );
      }

      await manager.save(Oferta, oferta);
      if (solicitudActual.estado === EstadoSolicitud.PUBLICADA) {
        solicitudActual.estado = EstadoSolicitud.CON_OFERTAS;
        await manager.save(Solicitud, solicitudActual);
        await this.registrarHistorial(
          manager,
          solicitudActual.id,
          EstadoSolicitud.CON_OFERTAS,
          usuarioId,
        );
      }
    });

    return toOfertaPublica(oferta);
  }

  async elegirOferta(
    clienteId: string,
    solicitudId: string,
    dto: ElegirOfertaDto,
  ): Promise<PagoPublico> {
    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager.findOne(Solicitud, {
        where: { id: solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!solicitud || solicitud.clienteId !== clienteId) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (
        solicitud.estado !== EstadoSolicitud.PUBLICADA &&
        solicitud.estado !== EstadoSolicitud.CON_OFERTAS &&
        solicitud.estado !== EstadoSolicitud.PENDIENTE_PAGO
      ) {
        throw new BadRequestException(
          'La solicitud no está disponible para elegir una oferta',
        );
      }
      if (solicitud.venceEn.getTime() <= Date.now()) {
        throw new BadRequestException('La solicitud está vencida');
      }

      const oferta = await manager.findOne(Oferta, {
        where: {
          id: dto.oferta_id,
          solicitudId,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!oferta) {
        throw new NotFoundException('Oferta no encontrada');
      }

      const esRenovacion =
        solicitud.estado === EstadoSolicitud.PENDIENTE_PAGO;
      if (esRenovacion) {
        if (oferta.estado !== EstadoOferta.ELEGIDA) {
          throw new BadRequestException(
            'Solo puede renovar el QR de la oferta elegida',
          );
        }
      } else if (oferta.estado !== EstadoOferta.ENVIADA) {
        throw new BadRequestException(
          'La oferta no está disponible para ser elegida',
        );
      }

      const pago = await this.pagosService.crearPagoInicial(
        manager,
        solicitud,
        oferta,
      );

      if (!esRenovacion) {
        oferta.estado = EstadoOferta.ELEGIDA;
        await manager.save(Oferta, oferta);

        const precio = manager.create(Precio, {
          solicitudId,
          tipo: TipoPrecio.PREVIO,
          monto: pago.precioTotalAcordado,
          motivo: null,
          fotoEvidenciaUrl: null,
          aprobadoCliente: true,
        });
        await manager.save(Precio, precio);

        solicitud.estado = EstadoSolicitud.PENDIENTE_PAGO;
        await manager.save(Solicitud, solicitud);
        await this.registrarHistorial(
          manager,
          solicitud.id,
          EstadoSolicitud.PENDIENTE_PAGO,
          clienteId,
        );
      }

      return toPagoPublico(pago);
    });
  }

  async registrarPrecioFinal(
    usuarioId: string,
    solicitudId: string,
    dto: CrearPrecioFinalDto,
  ): Promise<PrecioPublico> {
    const perfil = await this.obtenerPerfilTrabajador(usuarioId);

    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager.findOne(Solicitud, {
        where: { id: solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !solicitud ||
        solicitud.trabajadorConfirmadoId !== perfil.id
      ) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (solicitud.estado !== EstadoSolicitud.CONFIRMADA) {
        throw new BadRequestException(
          'La solicitud no está confirmada',
        );
      }

      const pago = await manager.findOne(Pago, {
        where: { solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pago || pago.estadoQr !== EstadoQr.PAGADO) {
        throw new BadRequestException(
          'La solicitud no tiene el pago inicial confirmado',
        );
      }

      const existente = await manager.findOne(Precio, {
        where: {
          solicitudId,
          tipo: TipoPrecio.FINAL,
        },
      });
      if (existente) {
        throw new BadRequestException(
          'Ya existe un precio final para esta solicitud',
        );
      }

      const calculo = this.reglas.calcularPrecioFinal(
        dto.monto,
        pago.pagoInicial25,
        solicitud.urgente,
      );
      const precio = manager.create(Precio, {
        solicitudId,
        tipo: TipoPrecio.FINAL,
        monto: calculo.total,
        motivo: null,
        fotoEvidenciaUrl: null,
        aprobadoCliente: null,
      });
      await manager.save(Precio, precio);

      return toPrecioPublico(precio);
    });
  }

  async responderPrecioFinal(
    clienteId: string,
    solicitudId: string,
    dto: ResponderPrecioDto,
  ): Promise<ResolucionPrecio> {
    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager.findOne(Solicitud, {
        where: { id: solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!solicitud || solicitud.clienteId !== clienteId) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (solicitud.estado !== EstadoSolicitud.CONFIRMADA) {
        throw new BadRequestException(
          'La solicitud no está pendiente de precio final',
        );
      }

      const precio = await manager.findOne(Precio, {
        where: {
          solicitudId,
          tipo: TipoPrecio.FINAL,
        },
      });
      if (!precio || precio.aprobadoCliente !== null) {
        throw new BadRequestException(
          'No hay un precio final pendiente de respuesta',
        );
      }

      const pago = await manager.findOne(Pago, {
        where: { solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pago || pago.estadoQr !== EstadoQr.PAGADO) {
        throw new BadRequestException(
          'La solicitud no tiene el pago inicial confirmado',
        );
      }

      if (dto.aprobado) {
        if (precio.monto < pago.pagoInicial25) {
          throw new BadRequestException(
            'El precio final no puede ser menor al pago inicial del 25%',
          );
        }
        precio.aprobadoCliente = true;
        await manager.save(Precio, precio);

        pago.precioTotalAcordado = precio.monto;
        pago.saldo75 = this.reglas.redondearBs(
          precio.monto - pago.pagoInicial25,
        );
        await manager.save(Pago, pago);

        solicitud.estado = EstadoSolicitud.EN_PROGRESO;
        await manager.save(Solicitud, solicitud);
        await this.registrarHistorial(
          manager,
          solicitud.id,
          EstadoSolicitud.EN_PROGRESO,
          clienteId,
        );

        return {
          precio: toPrecioPublico(precio),
          pago: toPagoPublico(pago),
          devolucion: null,
          estado_solicitud: solicitud.estado,
        };
      }

      precio.aprobadoCliente = false;
      await manager.save(Precio, precio);

      solicitud.estado = EstadoSolicitud.ANULADA;
      solicitud.cerradaEn = new Date();
      await manager.save(Solicitud, solicitud);
      await this.cerrarOfertas(manager, solicitud.id);

      const devolucion =
        await this.pagosService.registrarDevolucion(
          manager,
          pago,
          'Rechazo del precio final',
        );
      await this.registrarHistorial(
        manager,
        solicitud.id,
        EstadoSolicitud.ANULADA,
        clienteId,
      );

      return {
        precio: toPrecioPublico(precio),
        pago: toPagoPublico(pago),
        devolucion: toDevolucionPublica(devolucion),
        estado_solicitud: solicitud.estado,
      };
    });
  }

  async registrarIncremento(
    usuarioId: string,
    solicitudId: string,
    dto: CrearIncrementoDto,
  ): Promise<PrecioPublico> {
    const perfil = await this.obtenerPerfilTrabajador(usuarioId);

    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager.findOne(Solicitud, {
        where: { id: solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !solicitud ||
        solicitud.trabajadorConfirmadoId !== perfil.id
      ) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (solicitud.estado !== EstadoSolicitud.EN_PROGRESO) {
        throw new BadRequestException(
          'La solicitud no está en progreso',
        );
      }

      const pendiente = await manager.findOne(Precio, {
        where: {
          solicitudId,
          tipo: TipoPrecio.INCREMENTO,
          aprobadoCliente: IsNull(),
        },
      });
      if (pendiente) {
        throw new BadRequestException(
          'Ya hay un incremento pendiente de respuesta',
        );
      }

      const monto = this.reglas.redondearBs(dto.monto);
      if (monto <= 0) {
        throw new BadRequestException(
          'El monto del incremento debe ser mayor a 0',
        );
      }

      const precio = manager.create(Precio, {
        solicitudId,
        tipo: TipoPrecio.INCREMENTO,
        monto,
        motivo: dto.motivo,
        fotoEvidenciaUrl: dto.foto_evidencia_url,
        aprobadoCliente: null,
      });
      await manager.save(Precio, precio);

      return toPrecioPublico(precio);
    });
  }

  async responderIncremento(
    clienteId: string,
    solicitudId: string,
    precioId: string,
    dto: ResponderPrecioDto,
  ): Promise<ResolucionPrecio> {
    return this.dataSource.transaction(async (manager) => {
      const solicitud = await manager.findOne(Solicitud, {
        where: { id: solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!solicitud || solicitud.clienteId !== clienteId) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (solicitud.estado !== EstadoSolicitud.EN_PROGRESO) {
        throw new BadRequestException(
          'La solicitud no está en progreso',
        );
      }

      const precio = await manager.findOne(Precio, {
        where: {
          id: precioId,
          solicitudId,
          tipo: TipoPrecio.INCREMENTO,
        },
      });
      if (!precio) {
        throw new NotFoundException('Incremento no encontrado');
      }
      if (precio.aprobadoCliente !== null) {
        throw new BadRequestException(
          'El incremento ya fue respondido',
        );
      }

      const pago = await manager.findOne(Pago, {
        where: { solicitudId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pago || pago.estadoQr !== EstadoQr.PAGADO) {
        throw new BadRequestException(
          'La solicitud no tiene el pago inicial confirmado',
        );
      }

      if (dto.aprobado) {
        precio.aprobadoCliente = true;
        await manager.save(Precio, precio);

        pago.precioTotalAcordado = this.reglas.redondearBs(
          pago.precioTotalAcordado + precio.monto,
        );
        pago.saldo75 = this.reglas.redondearBs(
          pago.saldo75 + precio.monto,
        );
        await manager.save(Pago, pago);

        return {
          precio: toPrecioPublico(precio),
          pago: toPagoPublico(pago),
          devolucion: null,
          estado_solicitud: solicitud.estado,
        };
      }

      precio.aprobadoCliente = false;
      await manager.save(Precio, precio);

      solicitud.estado = EstadoSolicitud.ANULADA;
      solicitud.cerradaEn = new Date();
      await manager.save(Solicitud, solicitud);
      await this.cerrarOfertas(manager, solicitud.id);

      const devolucion =
        await this.pagosService.registrarDevolucion(
          manager,
          pago,
          'Rechazo de incremento',
        );
      await this.registrarHistorial(
        manager,
        solicitud.id,
        EstadoSolicitud.ANULADA,
        clienteId,
      );

      return {
        precio: toPrecioPublico(precio),
        pago: toPagoPublico(pago),
        devolucion: toDevolucionPublica(devolucion),
        estado_solicitud: solicitud.estado,
      };
    });
  }

  private async obtenerPerfilTrabajador(
    usuarioId: string,
  ): Promise<PerfilTrabajador> {
    const perfil = await this.perfilRepository.findOne({
      where: { usuarioId },
    });
    if (!perfil) {
      throw new NotFoundException(
        'No existe un perfil de trabajador para este usuario',
      );
    }
    return perfil;
  }

  private async cerrarOfertas(
    manager: EntityManager,
    solicitudId: string,
  ): Promise<void> {
    await manager.update(
      Oferta,
      {
        solicitudId,
        estado: In([
          EstadoOferta.ENVIADA,
          EstadoOferta.ELEGIDA,
        ]),
      },
      { estado: EstadoOferta.CERRADA },
    );
  }

  private async registrarHistorial(
    manager: EntityManager,
    solicitudId: string,
    estado: EstadoSolicitud,
    usuarioId: string,
  ): Promise<void> {
    const historial = manager.create(HistorialEstado, {
      solicitudId,
      estado,
      usuarioId,
    });
    await manager.save(HistorialEstado, historial);
  }
}

