import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';
import { EstadoAlerta } from '../common/enums/estado-alerta.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { toSolicitudPublica } from '../common/mappers/solicitud-publica.mapper.js';
import { toPublicZona } from '../common/mappers/zona-publica.mapper.js';
import { AlertaSolicitud } from '../entities/alerta-solicitud.entity.js';
import { ConfiguracionAlerta } from '../entities/configuracion-alerta.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { Zona } from '../entities/zona.entity.js';
import type { ActualizarConfiguracionAlertaDto } from './dto/actualizar-configuracion-alerta.dto.js';
import type { AmpliarPlazoDto } from './dto/ampliar-plazo.dto.js';
import type {
  AlertaSinOfertas,
  ListadoAlertasSinOfertas,
} from './interfaces/alerta-sin-ofertas.interface.js';
import type { ConfiguracionAlertaSinOfertas } from './interfaces/configuracion-alerta-sin-ofertas.interface.js';
import type { ResultadoAmpliacionPlazo } from './interfaces/resultado-ampliacion.interface.js';

const CONFIGURACION_ID = 1;
const MINUTOS_POR_DEFECTO = 24 * 60;
const MS_POR_MINUTO = 60 * 1000;

const ESTADOS_ABIERTOS: EstadoSolicitud[] = [
  EstadoSolicitud.PUBLICADA,
  EstadoSolicitud.CON_OFERTAS,
];

function toConfiguracionPublica(
  configuracion: ConfiguracionAlerta,
): ConfiguracionAlertaSinOfertas {
  return {
    minutos_sin_ofertas: configuracion.minutosSinOfertas,
    horas_equivalentes:
      Math.round((configuracion.minutosSinOfertas / 60) * 100) / 100,
    actualizada_en: configuracion.actualizadaEn ?? null,
    actualizado_por: configuracion.actualizadoPor ?? null,
  };
}

/**
 * Momento desde el que se mide el periodo sin ofertas. Después de una
 * ampliación se reinicia el conteo para no volver a alertar de inmediato.
 */
function inicioDelPeriodo(solicitud: Solicitud): Date {
  return solicitud.ultimaAmpliacionEn ?? solicitud.creadaEn;
}

function toAlertaSinOfertas(
  alerta: AlertaSolicitud,
  ahora: Date,
): AlertaSinOfertas | null {
  const solicitud = alerta.solicitud;
  if (!solicitud) {
    return null;
  }
  return {
    id: alerta.id,
    solicitud_id: alerta.solicitudId,
    estado: alerta.estado,
    minutos_configurados: alerta.minutosConfigurados,
    creada_en: alerta.creadaEn,
    vence_en_original: alerta.venceEnOriginal,
    vence_en_actual: solicitud.venceEn,
    estado_solicitud: solicitud.estado,
    especialidad: solicitud.especialidad,
    tipo_problema: solicitud.tipoProblema,
    descripcion: solicitud.descripcion,
    zona: solicitud.zona ? toPublicZona(solicitud.zona) : null,
    cliente_id: solicitud.clienteId,
    minutos_en_espera: Math.max(
      0,
      Math.floor(
        (ahora.getTime() - inicioDelPeriodo(solicitud).getTime()) /
          MS_POR_MINUTO,
      ),
    ),
  };
}

/**
 * Sistema de alertas para solicitudes abiertas sin ofertas y ampliación del
 * plazo de recepción de propuestas. La configuración y las alertas se
 * persisten en PostgreSQL.
 */
@Injectable()
export class AlertasService implements OnModuleInit {
  private readonly logger = new Logger(AlertasService.name);

  constructor(
    @InjectRepository(ConfiguracionAlerta)
    private readonly configuracionRepository: Repository<ConfiguracionAlerta>,
    @InjectRepository(AlertaSolicitud)
    private readonly alertaRepository: Repository<AlertaSolicitud>,
    @InjectRepository(Solicitud)
    private readonly solicitudRepository: Repository<Solicitud>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.obtenerConfiguracion();
    } catch (error) {
      this.logger.warn(
        'No se pudo inicializar la configuración de alertas sin ofertas',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  async obtenerConfiguracion(): Promise<ConfiguracionAlertaSinOfertas> {
    let configuracion = await this.configuracionRepository.findOne({
      where: { id: CONFIGURACION_ID },
    });
    if (!configuracion) {
      const nueva = this.configuracionRepository.create({
        id: CONFIGURACION_ID,
        minutosSinOfertas: MINUTOS_POR_DEFECTO,
        actualizadoPor: null,
      });
      configuracion = await this.configuracionRepository
        .save(nueva)
        .catch(async () => {
          const existente = await this.configuracionRepository.findOne({
            where: { id: CONFIGURACION_ID },
          });
          if (!existente) {
            throw new Error(
              'No se pudo crear la configuración de alertas',
            );
          }
          return existente;
        });
    }
    return toConfiguracionPublica(configuracion);
  }

  async actualizarConfiguracion(
    dto: ActualizarConfiguracionAlertaDto,
    usuarioId: string,
  ): Promise<ConfiguracionAlertaSinOfertas> {
    const minutos = dto.minutos_sin_ofertas;
    if (!Number.isInteger(minutos) || minutos <= 0) {
      throw new BadRequestException(
        'El periodo sin ofertas debe ser un número entero mayor a cero',
      );
    }

    let configuracion = await this.configuracionRepository.findOne({
      where: { id: CONFIGURACION_ID },
    });
    if (!configuracion) {
      configuracion = this.configuracionRepository.create({
        id: CONFIGURACION_ID,
        minutosSinOfertas: minutos,
        actualizadoPor: usuarioId,
      });
    } else {
      configuracion.minutosSinOfertas = minutos;
      configuracion.actualizadoPor = usuarioId;
    }

    const guardada = await this.configuracionRepository.save(configuracion);
    this.logger.log(
      `Periodo de alerta sin ofertas actualizado a ${minutos} min por ${usuarioId}`,
    );
    return toConfiguracionPublica(guardada);
  }

  async listar(): Promise<ListadoAlertasSinOfertas> {
    const configuracion = await this.obtenerConfiguracion();
    await this.sincronizar(configuracion.minutos_sin_ofertas);

    const alertas = await this.alertaRepository.find({
      where: { estado: EstadoAlerta.ACTIVA },
      relations: { solicitud: { zona: true } },
      order: { creadaEn: 'ASC' },
    });
    const ahora = new Date();
    const publicas = alertas
      .map((alerta) => toAlertaSinOfertas(alerta, ahora))
      .filter((alerta): alerta is AlertaSinOfertas => alerta !== null);

    return {
      minutos_sin_ofertas: configuracion.minutos_sin_ofertas,
      total: publicas.length,
      alertas: publicas,
    };
  }

  async ampliarPlazo(
    usuario: AuthenticatedUser,
    solicitudId: string,
    dto: AmpliarPlazoDto,
  ): Promise<ResultadoAmpliacionPlazo> {
    this.verificarPermiso(usuario);

    const nuevaFecha = new Date(dto.nueva_fecha);
    if (Number.isNaN(nuevaFecha.getTime())) {
      throw new BadRequestException(
        'La nueva fecha límite no es válida',
      );
    }

    const resultado = await this.dataSource.transaction(
      async (manager) => {
        const solicitud = await manager.findOne(Solicitud, {
          where: { id: solicitudId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!solicitud) {
          throw new NotFoundException('Solicitud no encontrada');
        }
        if (
          !ESTADOS_ABIERTOS.includes(solicitud.estado) ||
          solicitud.trabajadorConfirmadoId !== null
        ) {
          throw new BadRequestException(
            'La solicitud ya no está abierta para ampliar el plazo',
          );
        }

        const ofertas = await manager.count(Oferta, {
          where: { solicitudId },
        });
        if (ofertas > 0) {
          throw new BadRequestException(
            'La solicitud ya recibió ofertas; no se puede ampliar el plazo',
          );
        }

        const ahora = new Date();
        if (nuevaFecha.getTime() <= ahora.getTime()) {
          throw new BadRequestException(
            'La nueva fecha límite debe ser posterior a la fecha actual',
          );
        }
        if (nuevaFecha.getTime() <= solicitud.venceEn.getTime()) {
          throw new BadRequestException(
            'La nueva fecha límite debe ser posterior al plazo actual',
          );
        }

        const venceEnAnterior = solicitud.venceEn;
        solicitud.venceEn = nuevaFecha;
        solicitud.ultimaAmpliacionEn = ahora;
        if (solicitud.urgente) {
          /**
           * RN06: las solicitudes urgentes se anulan al cumplir el tope de
           * prioridad. Al ampliar el plazo se desactiva ese tope para que la
           * prórroga no sea anulada antes del nuevo vencimiento.
           */
          solicitud.entroAlTope = null;
        }
        await manager.save(Solicitud, solicitud);

        const resolucion = await manager.update(
          AlertaSolicitud,
          {
            solicitudId,
            estado: EstadoAlerta.ACTIVA,
          },
          {
            estado: EstadoAlerta.RESUELTA,
            resueltaEn: ahora,
            resueltaPor: usuario.id,
          },
        );

        return {
          solicitud,
          venceEnAnterior,
          alertasResueltas: resolucion.affected ?? 0,
        };
      },
    );

    const zona = await this.zonaRepository.findOne({
      where: { id: resultado.solicitud.zonaId },
    });

    return {
      solicitud: toSolicitudPublica(resultado.solicitud, zona),
      alertas_resueltas: resultado.alertasResueltas,
      vence_en_anterior: resultado.venceEnAnterior,
      vence_en_nueva: resultado.solicitud.venceEn,
    };
  }

  /** Revisa periódicamente las solicitudes para mantener las alertas al día. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async detectarProgramadas(): Promise<void> {
    try {
      const configuracion = await this.obtenerConfiguracion();
      await this.sincronizar(configuracion.minutos_sin_ofertas);
    } catch (error) {
      this.logger.warn(
        'No se pudieron sincronizar las alertas de solicitudes sin ofertas',
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  private verificarPermiso(usuario: AuthenticatedUser): void {
    const puedeAmpliar =
      usuario.rolActivo === Rol.SUPERVISOR ||
      usuario.rolActivo === Rol.SUPERADMIN ||
      (usuario.roles?.includes(Rol.SUPERADMIN) ?? false);
    if (!puedeAmpliar) {
      throw new ForbiddenException(
        'No tienes permisos para ampliar el plazo de una solicitud',
      );
    }
  }

  /**
   * Momento desde el que se mide el periodo sin ofertas. Después de una
   * ampliación se reinicia el conteo para no regenerar la alerta de inmediato.
   */
  private inicioDelPeriodo(solicitud: Solicitud): Date {
    return solicitud.ultimaAmpliacionEn ?? solicitud.creadaEn;
  }

  /**
   * Crea las alertas faltantes y resuelve las que dejaron de aplicar porque
   * la solicitud recibió ofertas, cambió de estado o fue eliminada.
   */
  private async sincronizar(minutosSinOfertas: number): Promise<void> {
    const ahora = new Date();
    const limite = new Date(
      ahora.getTime() - minutosSinOfertas * MS_POR_MINUTO,
    );

    const [candidatas, activas] = await Promise.all([
      this.solicitudRepository.find({
        where: [
          {
            estado: EstadoSolicitud.PUBLICADA,
            creadaEn: LessThanOrEqual(limite),
          },
          {
            estado: EstadoSolicitud.CON_OFERTAS,
            creadaEn: LessThanOrEqual(limite),
          },
        ],
      }),
      this.alertaRepository.find({
        where: { estado: EstadoAlerta.ACTIVA },
      }),
    ]);

    const ids = [
      ...new Set([
        ...candidatas.map((solicitud) => solicitud.id),
        ...activas.map((alerta) => alerta.solicitudId),
      ]),
    ];
    if (ids.length === 0) {
      return;
    }

    const [solicitudes, ofertas] = await Promise.all([
      this.solicitudRepository.find({ where: { id: In(ids) } }),
      this.ofertaRepository.find({
        where: { solicitudId: In(ids) },
        select: { solicitudId: true },
      }),
    ]);
    const conOfertas = new Set(
      ofertas.map((oferta) => oferta.solicitudId),
    );

    const elegibles = solicitudes.filter(
      (solicitud) =>
        ESTADOS_ABIERTOS.includes(solicitud.estado) &&
        !conOfertas.has(solicitud.id) &&
        this.inicioDelPeriodo(solicitud).getTime() <= limite.getTime(),
    );
    const idsElegibles = new Set(
      elegibles.map((solicitud) => solicitud.id),
    );

    const aResolver = activas.filter(
      (alerta) => !idsElegibles.has(alerta.solicitudId),
    );
    if (aResolver.length > 0) {
      await this.alertaRepository.update(
        { id: In(aResolver.map((alerta) => alerta.id)) },
        {
          estado: EstadoAlerta.RESUELTA,
          resueltaEn: ahora,
          resueltaPor: null,
        },
      );
    }

    const yaAlertadas = new Set(
      activas
        .filter((alerta) => idsElegibles.has(alerta.solicitudId))
        .map((alerta) => alerta.solicitudId),
    );
    const nuevas = elegibles.filter(
      (solicitud) => !yaAlertadas.has(solicitud.id),
    );
    if (nuevas.length === 0) {
      return;
    }

    await this.alertaRepository
      .createQueryBuilder()
      .insert()
      .values(
        nuevas.map((solicitud) => ({
          solicitudId: solicitud.id,
          estado: EstadoAlerta.ACTIVA,
          minutosConfigurados: minutosSinOfertas,
          venceEnOriginal: solicitud.venceEn,
          resueltaEn: null,
          resueltaPor: null,
        })),
      )
      .orIgnore()
      .execute();
  }
}
