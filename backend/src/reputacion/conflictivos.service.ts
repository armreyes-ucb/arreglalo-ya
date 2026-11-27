import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { EstadoClienteConflictivo } from '../common/enums/estado-cliente-conflictivo.enum.js';
import { EstadoReclamo } from '../common/enums/estado-reclamo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { OrigenReclamo } from '../common/enums/origen-reclamo.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { toClienteConflictivoPublico } from '../common/mappers/cliente-conflictivo-publico.mapper.js';
import { ConfiguracionConflictivosService } from '../configuracion/configuracion-conflictivos.service.js';
import { ClienteConflictivo } from '../entities/cliente-conflictivo.entity.js';
import { HistorialEstado } from '../entities/historial-estado.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import type { ListarConflictivosQueryDto } from './dto/listar-conflictivos-query.dto.js';
import type { RegistrarConflictivoDto } from './dto/registrar-conflictivo.dto.js';
import type { ClienteConflictivoPublico } from './interfaces/cliente-conflictivo-publico.interface.js';
import type { ResumenDeteccion } from './interfaces/resumen-deteccion.interface.js';
import {
  evaluarCriteriosConflictivo,
  hayEvidenciaPosterior,
  type IndicadoresConflictivo,
} from './utils/deteccion-conflictivos.js';

const MS_POR_DIA = 86_400_000;

interface FilaAgregada {
  cliente_id: string;
  total?: string;
  rechazados?: string;
  cancelaciones?: string;
  ultima?: Date | string | null;
}

function indicadoresVacios(): IndicadoresConflictivo {
  return {
    reclamosTotales: 0,
    reclamosRechazados: 0,
    cancelaciones: 0,
    reportesComprobados: 0,
    reportesPendientes: 0,
    ultimaEvidencia: null,
  };
}

/** Normaliza la fecha que devuelve el driver de PostgreSQL. */
function aFecha(valor: Date | string | null | undefined): Date | null {
  if (!valor) {
    return null;
  }
  const fecha = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function maxFecha(actual: Date | null, nueva: Date | null): Date | null {
  if (!nueva) {
    return actual;
  }
  if (!actual) {
    return nueva;
  }
  return nueva.getTime() > actual.getTime() ? nueva : actual;
}

@Injectable()
export class ConflictivosService {
  private readonly logger = new Logger(ConflictivosService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ClienteConflictivo)
    private readonly conflictivoRepository: Repository<ClienteConflictivo>,
    private readonly configuracion: ConfiguracionConflictivosService,
  ) {}

  /** RF32: bandeja de casos, opcionalmente filtrada por estado. */
  async listar(
    query: ListarConflictivosQueryDto = {},
  ): Promise<ClienteConflictivoPublico[]> {
    const casos = await this.conflictivoRepository.find({
      where: query.estado ? { estado: query.estado } : {},
      order: { actualizadoEn: 'DESC' },
    });
    return this.mapear(casos);
  }

  /** RF32: advertencia puntual para el trabajador. */
  async obtener(clienteId: string): Promise<ClienteConflictivoPublico> {
    const conflictivo = await this.conflictivoRepository.findOne({
      where: { clienteId },
    });
    if (!conflictivo) {
      throw new NotFoundException(
        'El cliente no tiene reportes registrados',
      );
    }
    return toClienteConflictivoPublico(
      conflictivo,
      this.configuracion.get().min_reportes,
    );
  }

  /**
   * RF32: registra un reporte comprobado por el supervisor. Si el cliente
   * ya existe se incrementa el acumulado sin tocar el estado del caso.
   */
  async registrar(
    dto: RegistrarConflictivoDto,
    supervisorId: string,
  ): Promise<ClienteConflictivoPublico> {
    const umbral = this.configuracion.get().min_reportes;
    const resultado = await this.dataSource.transaction(
      async (manager) => {
        const cliente = await manager.findOne(Usuario, {
          where: { id: dto.cliente_id },
        });
        if (!cliente || !cliente.roles.includes(Rol.CLIENTE)) {
          throw new NotFoundException('Cliente no encontrado');
        }

        const existente = await manager.findOne(ClienteConflictivo, {
          where: { clienteId: dto.cliente_id },
          lock: { mode: 'pessimistic_write' },
        });

        if (existente) {
          existente.reportesAcumulados += 1;
          existente.reportesComprobados += 1;
          existente.motivo = dto.motivo.trim();
          existente.registradoPorId = supervisorId;
          await manager.save(ClienteConflictivo, existente);
          return existente;
        }

        const nuevo = manager.create(ClienteConflictivo, {
          clienteId: dto.cliente_id,
          reportesAcumulados: 1,
          reportesComprobados: 1,
          reportesPendientes: 0,
          motivo: dto.motivo.trim(),
          registradoPorId: supervisorId,
          estado: EstadoClienteConflictivo.POTENCIAL,
          periodoDias: this.configuracion.get().periodo_dias,
        });
        await manager.save(ClienteConflictivo, nuevo);
        return nuevo;
      },
    );
    return toClienteConflictivoPublico(resultado, umbral);
  }

  /**
   * RF32: detección automática. Agrega reclamos y cancelaciones reales en
   * una sola consulta por fuente y actualiza como máximo un caso por
   * cliente. Es idempotente y nunca confirma ni desestima por sí sola.
   */
  async detectar(
    ahora: Date = new Date(),
    soloClientes?: string[],
  ): Promise<ResumenDeteccion> {
    const criterios = this.configuracion.get();
    const resumen: ResumenDeteccion = {
      omitido: false,
      evaluados: 0,
      potenciales: 0,
      actualizados: 0,
      reabiertos: 0,
    };
    if (!criterios.deteccion_activa) {
      resumen.omitido = true;
      return resumen;
    }

    const desde = new Date(
      ahora.getTime() - criterios.periodo_dias * MS_POR_DIA,
    );
    const filtroClientes =
      soloClientes && soloClientes.length > 0
        ? soloClientes
        : undefined;

    const [casos, filasReclamos, filasCancelaciones] = await Promise.all([
      this.conflictivoRepository.find({
        where: filtroClientes
          ? { clienteId: In(filtroClientes) }
          : {},
      }),
      this.agregarReclamos(desde, filtroClientes),
      this.agregarCancelaciones(desde, filtroClientes),
    ]);

    const casosPorCliente = new Map(
      casos.map((caso) => [caso.clienteId, caso]),
    );
    const indicadores = new Map<string, IndicadoresConflictivo>();
    for (const caso of casos) {
      indicadores.set(caso.clienteId, {
        ...indicadoresVacios(),
        reportesComprobados: caso.reportesComprobados,
        reportesPendientes: caso.reportesPendientes,
      });
    }

    for (const fila of filasReclamos) {
      const actual = this.obtenerIndicadores(indicadores, fila.cliente_id);
      actual.reclamosTotales = Number(fila.total ?? 0);
      actual.reclamosRechazados = Number(fila.rechazados ?? 0);
      actual.ultimaEvidencia = maxFecha(
        actual.ultimaEvidencia,
        aFecha(fila.ultima),
      );
    }

    for (const fila of filasCancelaciones) {
      const actual = this.obtenerIndicadores(indicadores, fila.cliente_id);
      actual.cancelaciones = Number(fila.cancelaciones ?? 0);
      actual.ultimaEvidencia = maxFecha(
        actual.ultimaEvidencia,
        aFecha(fila.ultima),
      );
    }

    for (const [clienteId, valores] of indicadores) {
      resumen.evaluados += 1;
      const evaluacion = evaluarCriteriosConflictivo(valores, criterios);
      if (!evaluacion.cumple) {
        continue;
      }

      const motivo = evaluacion.motivos.join('; ');
      const existente = casosPorCliente.get(clienteId);

      if (!existente) {
        const nuevo = this.conflictivoRepository.create({
          clienteId,
          reportesAcumulados: 0,
          reportesComprobados: 0,
          reportesPendientes: 0,
          motivo,
          registradoPorId: null,
          estado: EstadoClienteConflictivo.POTENCIAL,
          reclamosTotales: valores.reclamosTotales,
          reclamosRechazados: valores.reclamosRechazados,
          cancelaciones: valores.cancelaciones,
          periodoDias: criterios.periodo_dias,
          evidenciaCorte: null,
        });
        await this.conflictivoRepository.save(nuevo);
        resumen.potenciales += 1;
        continue;
      }

      if (existente.estado === EstadoClienteConflictivo.CONFIRMADO) {
        continue;
      }

      let reabierto = false;
      if (existente.estado === EstadoClienteConflictivo.DESESTIMADO) {
        if (
          !hayEvidenciaPosterior(
            valores.ultimaEvidencia,
            existente.evidenciaCorte,
          )
        ) {
          continue;
        }
        reabierto = true;
      }

      const sinCambios =
        !reabierto &&
        existente.reclamosTotales === valores.reclamosTotales &&
        existente.reclamosRechazados === valores.reclamosRechazados &&
        existente.cancelaciones === valores.cancelaciones &&
        existente.periodoDias === criterios.periodo_dias &&
        existente.motivo === motivo;
      if (sinCambios) {
        continue;
      }

      existente.reclamosTotales = valores.reclamosTotales;
      existente.reclamosRechazados = valores.reclamosRechazados;
      existente.cancelaciones = valores.cancelaciones;
      existente.periodoDias = criterios.periodo_dias;
      existente.motivo = motivo;
      if (reabierto) {
        existente.estado = EstadoClienteConflictivo.POTENCIAL;
        resumen.reabiertos += 1;
      }
      await this.conflictivoRepository.save(existente);
      resumen.actualizados += 1;
    }

    return resumen;
  }

  /**
   * Reevaluación puntual tras resolver un reclamo o cancelar una solicitud.
   * Nunca propaga el error para no reportar como fallida una operación que
   * ya quedó confirmada en la base de datos.
   */
  async refrescarCliente(clienteId: string): Promise<void> {
    try {
      await this.detectar(new Date(), [clienteId]);
    } catch (error) {
      this.logger.warn(
        `No se pudo reevaluar al cliente ${clienteId}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }

  private obtenerIndicadores(
    mapa: Map<string, IndicadoresConflictivo>,
    clienteId: string,
  ): IndicadoresConflictivo {
    const actual = mapa.get(clienteId);
    if (actual) {
      return actual;
    }
    const nuevo = indicadoresVacios();
    mapa.set(clienteId, nuevo);
    return nuevo;
  }

  private mapear(
    casos: ClienteConflictivo[],
  ): ClienteConflictivoPublico[] {
    const umbral = this.configuracion.get().min_reportes;
    return casos.map((caso) =>
      toClienteConflictivoPublico(caso, umbral),
    );
  }

  /** Reclamos iniciados por el cliente en el periodo. */
  private agregarReclamos(
    desde: Date,
    clientes?: string[],
  ): Promise<FilaAgregada[]> {
    const query = this.dataSource
      .getRepository(Reclamo)
      .createQueryBuilder('r')
      .innerJoin(Solicitud, 's', 's.id = r.solicitudId')
      .select('s.clienteId', 'cliente_id')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `COUNT(*) FILTER (WHERE r.estado = '${EstadoReclamo.RECHAZADO}')`,
        'rechazados',
      )
      .addSelect('MAX(r.fechaApertura)', 'ultima')
      .where('r.origen = :origen', { origen: OrigenReclamo.CLIENTE })
      .andWhere('r.estado <> :falta', {
        falta: EstadoReclamo.FALTA_TRABAJADOR,
      })
      .andWhere('r.fechaApertura >= :desde', { desde })
      .groupBy('s.clienteId');
    if (clientes) {
      query.andWhere('s.clienteId IN (:...clientes)', { clientes });
    }
    return query.getRawMany<FilaAgregada>();
  }

  /** Cancelaciones realizadas por el propio cliente (una por solicitud). */
  private agregarCancelaciones(
    desde: Date,
    clientes?: string[],
  ): Promise<FilaAgregada[]> {
    const query = this.dataSource
      .getRepository(HistorialEstado)
      .createQueryBuilder('h')
      .innerJoin(Solicitud, 's', 's.id = h.solicitudId')
      .select('s.clienteId', 'cliente_id')
      .addSelect('COUNT(DISTINCT h.solicitudId)', 'cancelaciones')
      .addSelect('MAX(h.fechaHora)', 'ultima')
      .where('h.estado = :cancelada', {
        cancelada: EstadoSolicitud.CANCELADA,
      })
      .andWhere('h.usuarioId = s.clienteId')
      .andWhere('s.estado = :cancelada', {
        cancelada: EstadoSolicitud.CANCELADA,
      })
      .andWhere('h.fechaHora >= :desde', { desde })
      .groupBy('s.clienteId');
    if (clientes) {
      query.andWhere('s.clienteId IN (:...clientes)', { clientes });
    }
    return query.getRawMany<FilaAgregada>();
  }
}
