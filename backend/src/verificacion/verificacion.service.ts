import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  In,
  Not,
  Repository,
  type EntityManager,
} from 'typeorm';
import { DecisionRevision } from '../common/enums/decision-revision.enum.js';
import { EstadoRevision } from '../common/enums/estado-revision.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { TipoDocumento } from '../common/enums/tipo-documento.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { hoyISO, sumarAniosISO, sumarDias } from '../common/utils/fechas.js';
import { cifrarNumeroCuenta } from '../common/utils/cifrar-cuenta.js';
import { ConfiguracionService } from '../configuracion/configuracion.service.js';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity.js';
import { Documento } from '../entities/documento.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import {
  DocumentStorageService,
  type ArchivoDescargado,
} from './document-storage.service.js';
import type { CargarDocumentosDto } from './dto/cargar-documentos.dto.js';
import type { RevisarVerificacionDto } from './dto/revisar-verificacion.dto.js';
import type { ArchivoSubido } from './interfaces/archivo-subido.interface.js';
import type { EstadoVerificacionTrabajador } from './interfaces/estado-verificacion.interface.js';
import type { ExpedienteVerificacion } from './interfaces/expediente-verificacion.interface.js';
import type { RespuestaCargaDocumentos } from './interfaces/respuesta-carga-documentos.interface.js';
import type { ResultadoRevisionVerificacion } from './interfaces/resultado-revision-verificacion.interface.js';
import {
  toDocumentoRevision,
  toEstadoVerificacionTrabajador,
  toExpedienteVerificacion,
  toRespuestaCargaDocumentos,
} from './mappers/verificacion.mapper.js';
import { validarArchivoDocumento } from './utils/validar-archivo.js';

const TIPOS_VERIFICACION: TipoDocumento[] = [
  TipoDocumento.CARNET_ANVERSO,
  TipoDocumento.CARNET_REVERSO,
  TipoDocumento.SELFIE,
  TipoDocumento.REJAP,
  TipoDocumento.CERTIFICADO,
];

@Injectable()
export class VerificacionService {
  private readonly logger = new Logger(VerificacionService.name);

  constructor(
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    @InjectRepository(CuentaBancaria)
    private readonly cuentaRepository: Repository<CuentaBancaria>,
    private readonly documentStorage: DocumentStorageService,
    private readonly dataSource: DataSource,
    private readonly configuracion: ConfiguracionService,
  ) {}

  async cargarDocumentos(
    usuarioId: string,
    dto: CargarDocumentosDto,
    archivos: Record<string, ArchivoSubido[]>,
  ): Promise<RespuestaCargaDocumentos> {
    const perfil = await this.perfilRepository.findOne({
      where: { usuarioId },
    });
    if (!perfil) {
      throw new NotFoundException(
        'No existe un perfil de trabajador para este usuario',
      );
    }

    const documentosValidados: Array<{
      tipo: TipoDocumento;
      archivo: ArchivoSubido;
    }> = [];
    for (const tipo of TIPOS_VERIFICACION) {
      const lista = archivos[tipo] ?? [];
      if (lista.length === 0) {
        throw new BadRequestException(`Falta el documento obligatorio ${tipo}`);
      }
      if (lista.length > 1) {
        throw new BadRequestException(
          `Solo se permite un archivo para ${tipo}`,
        );
      }
      validarArchivoDocumento(tipo, lista[0]);
      documentosValidados.push({ tipo, archivo: lista[0] });
    }

    const venceAntecedentes = this.resolverVenceAntecedentes(
      perfil,
      dto.vence_antecedentes,
    );

    await this.dataSource.transaction(async (manager) => {
      await this.reemplazarDocumentos(
        manager,
        perfil.id,
        documentosValidados,
        venceAntecedentes,
      );
      await this.guardarCuentaBancaria(manager, usuarioId, dto);
    });

    const [perfilActual, documentos, cuenta] = await Promise.all([
      this.perfilRepository.findOne({ where: { id: perfil.id } }),
      this.documentoRepository.find({
        where: {
          trabajadorId: perfil.id,
          tipo: In(TIPOS_VERIFICACION),
        },
        order: { fechaCarga: 'ASC' },
      }),
      this.cuentaRepository.findOne({ where: { usuarioId } }),
    ]);
    if (!perfilActual || !cuenta) {
      throw new NotFoundException(
        'No se pudo recuperar la verificación registrada',
      );
    }
    return toRespuestaCargaDocumentos(
      perfilActual,
      documentos,
      cuenta,
      venceAntecedentes,
    );
  }

  async reemplazarDocumento(
    usuarioId: string,
    tipoRecibido: string,
    archivos: Record<string, ArchivoSubido[]>,
  ): Promise<RespuestaCargaDocumentos> {
    if (!TIPOS_VERIFICACION.includes(tipoRecibido as TipoDocumento)) {
      throw new BadRequestException('Tipo de documento no permitido');
    }
    const tipo = tipoRecibido as TipoDocumento;
    const lista = archivos[tipo] ?? [];
    if (lista.length !== 1) {
      throw new BadRequestException(`Se requiere un archivo para ${tipo}`);
    }
    validarArchivoDocumento(tipo, lista[0]);

    const perfil = await this.perfilRepository.findOne({
      where: { usuarioId },
    });
    if (!perfil) {
      throw new NotFoundException(
        'No existe un perfil de trabajador para este usuario',
      );
    }

    const venceAntecedentes =
      tipo === TipoDocumento.REJAP
        ? sumarAniosISO(new Date(), 1)
        : perfil.venceAntecedentes;
    await this.dataSource.transaction(async (manager) => {
      const existente = await manager.findOne(Documento, {
        where: { trabajadorId: perfil.id, tipo },
        lock: { mode: 'pessimistic_write' },
      });
      if (!existente)
        throw new NotFoundException('No existe un documento para reemplazar');
      const rejapVencido =
        tipo === TipoDocumento.REJAP &&
        Boolean(existente.venceEn && existente.venceEn < hoyISO());
      if (
        existente.estadoRevision !== EstadoRevision.REQUIERE_DATOS &&
        existente.estadoRevision !== EstadoRevision.RECHAZADO &&
        !rejapVencido
      ) {
        throw new BadRequestException(
          'Solo se pueden reemplazar documentos rechazados, observados o con REJAP vencido',
        );
      }
      const url = await this.documentStorage.guardar(lista[0]);
      await manager.delete(Documento, { trabajadorId: perfil.id, tipo });
      const documento = manager.create(Documento, {
        trabajadorId: perfil.id,
        tipo,
        archivoPrivadoUrl: url,
        estadoRevision: EstadoRevision.PENDIENTE,
        motivoRechazo: null,
        revisadoPorId: null,
        venceEn: tipo === TipoDocumento.REJAP ? venceAntecedentes : null,
      });
      await manager.save(Documento, documento);
      perfil.venceAntecedentes = venceAntecedentes;
      perfil.nivelVerificacion =
        tipo === TipoDocumento.REJAP
          ? Math.min(perfil.nivelVerificacion, 1)
          : tipo === TipoDocumento.CERTIFICADO
            ? perfil.nivelVerificacion
            : 0;
      if (perfil.estado === EstadoTrabajador.ACTIVO)
        perfil.estado = EstadoTrabajador.PENDIENTE;
      await manager.save(PerfilTrabajador, perfil);
    });

    const [perfilActual, documentos, cuenta] = await Promise.all([
      this.perfilRepository.findOne({ where: { id: perfil.id } }),
      this.documentoRepository.find({
        where: { trabajadorId: perfil.id, tipo: In(TIPOS_VERIFICACION) },
        order: { fechaCarga: 'ASC' },
      }),
      this.cuentaRepository.findOne({ where: { usuarioId } }),
    ]);
    if (!perfilActual)
      throw new NotFoundException(
        'No se pudo recuperar la verificación registrada',
      );
    return toRespuestaCargaDocumentos(
      perfilActual,
      documentos,
      cuenta,
      venceAntecedentes,
    );
  }

  async obtenerBandeja(): Promise<ExpedienteVerificacion[]> {
    const pendientes = await this.documentoRepository.find({
      where: { estadoRevision: EstadoRevision.PENDIENTE },
      order: { fechaCarga: 'ASC' },
    });
    if (pendientes.length === 0) {
      return [];
    }

    const fechasPorPerfil = new Map<string, Date>();
    for (const documento of pendientes) {
      if (!fechasPorPerfil.has(documento.trabajadorId)) {
        fechasPorPerfil.set(documento.trabajadorId, documento.fechaCarga);
      }
    }
    const perfilIds = [...fechasPorPerfil.keys()];
    const [perfiles, documentos] = await Promise.all([
      this.perfilRepository.find({
        where: { id: In(perfilIds) },
        relations: {
          usuario: {
            cuentaBancaria: true,
          },
        },
      }),
      this.documentoRepository.find({
        where: {
          trabajadorId: In(perfilIds),
          tipo: In(TIPOS_VERIFICACION),
        },
        order: { fechaCarga: 'ASC' },
      }),
    ]);

    const documentosPorPerfil = new Map<string, Documento[]>();
    for (const documento of documentos) {
      const actuales = documentosPorPerfil.get(documento.trabajadorId) ?? [];
      actuales.push(documento);
      documentosPorPerfil.set(documento.trabajadorId, actuales);
    }

    const expedientes = perfiles.map((perfil) =>
      toExpedienteVerificacion(
        perfil,
        documentosPorPerfil.get(perfil.id) ?? [],
        perfil.usuario?.cuentaBancaria ?? null,
        fechasPorPerfil.get(perfil.id) ?? new Date(),
      ),
    );
    return expedientes.sort((a, b) => b.horas_en_espera - a.horas_en_espera);
  }

  async obtenerEstado(
    usuarioId: string,
  ): Promise<EstadoVerificacionTrabajador> {
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
    const documentos = await this.documentoRepository.find({
      where: {
        trabajadorId: perfil.id,
        tipo: In(TIPOS_VERIFICACION),
      },
      order: { fechaCarga: 'ASC' },
    });
    return toEstadoVerificacionTrabajador(
      perfil,
      documentos,
      perfil.usuario.cuentaBancaria ?? null,
      this.configuracion.get().dias_aviso_antecedentes,
    );
  }

  /**
   * RF10: tarea diaria que revisa los REJAP próximos a vencer. El bloqueo
   * de ofertas y la pérdida de la insignia se derivan de la fecha, así que
   * aquí solo se registra el aviso operativo.
   */
  async avisarAntecedentesPorVencer(ahora: Date = new Date()): Promise<number> {
    const diasAviso = this.configuracion.get().dias_aviso_antecedentes;
    const hoy = hoyISO(ahora);
    const limite = hoyISO(sumarDias(ahora, diasAviso));

    const perfiles = await this.perfilRepository.find({
      where: {
        venceAntecedentes: Between(hoy, limite),
        estado: Not(EstadoTrabajador.BAJA),
      },
      relations: { usuario: true },
    });

    for (const perfil of perfiles) {
      this.logger.warn(
        `REJAP por vencer el ${perfil.venceAntecedentes}: trabajador ${perfil.usuario?.nombreCompleto ?? perfil.usuarioId}`,
      );
    }
    return perfiles.length;
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async avisarAntecedentesPorVencerProgramado(): Promise<void> {
    try {
      const avisados = await this.avisarAntecedentesPorVencer();
      if (avisados > 0) {
        this.logger.log(`Avisos de vencimiento de antecedentes: ${avisados}`);
      }
    } catch (error) {
      this.logger.error(
        'No se pudo revisar el vencimiento de antecedentes',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async obtenerArchivoDocumento(
    usuario: AuthenticatedUser,
    trabajadorId: string,
    documentoId: string,
  ): Promise<ArchivoDescargado & { tipo: string }> {
    const documento = await this.documentoRepository.findOne({
      where: { id: documentoId, trabajadorId },
    });
    if (!documento) {
      throw new NotFoundException('Documento no encontrado');
    }
    if (usuario.rolActivo === Rol.TRABAJADOR) {
      const perfil = await this.perfilRepository.findOne({
        where: { id: trabajadorId, usuarioId: usuario.id },
      });
      if (!perfil) {
        throw new ForbiddenException(
          'No tienes permisos para ver este documento',
        );
      }
    }
    const archivo = await this.documentStorage.leer(
      documento.archivoPrivadoUrl,
    );
    return { ...archivo, tipo: documento.tipo };
  }

  async revisarDocumento(
    trabajadorId: string,
    documentoId: string,
    supervisorId: string,
    dto: RevisarVerificacionDto,
  ): Promise<ResultadoRevisionVerificacion> {
    const motivo = dto.motivo_rechazo?.trim() ?? '';
    if (dto.decision !== DecisionRevision.APROBAR && !motivo) {
      throw new BadRequestException(
        'Debe indicar un motivo para rechazar o solicitar nuevos datos',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const perfil = await manager.findOne(PerfilTrabajador, {
        where: { id: trabajadorId },
        relations: { usuario: { cuentaBancaria: true } },
      });
      if (!perfil) throw new NotFoundException('Trabajador no encontrado');

      const documento = await manager.findOne(Documento, {
        where: { id: documentoId, trabajadorId },
      });
      if (!documento) throw new NotFoundException('Documento no encontrado');
      if (documento.estadoRevision !== EstadoRevision.PENDIENTE) {
        throw new BadRequestException(
          'El documento no está pendiente de revisión',
        );
      }

      documento.estadoRevision =
        dto.decision === DecisionRevision.APROBAR
          ? EstadoRevision.APROBADO
          : dto.decision === DecisionRevision.RECHAZAR
            ? EstadoRevision.RECHAZADO
            : EstadoRevision.REQUIERE_DATOS;
      documento.motivoRechazo =
        dto.decision === DecisionRevision.APROBAR ? null : motivo;
      documento.revisadoPorId = supervisorId;
      await manager.save(Documento, documento);

      const documentos = await manager.find(Documento, {
        where: { trabajadorId, tipo: In(TIPOS_VERIFICACION) },
        order: { fechaCarga: 'ASC' },
      });
      const tiposNivel1 = [
        TipoDocumento.CARNET_ANVERSO,
        TipoDocumento.CARNET_REVERSO,
        TipoDocumento.SELFIE,
      ];
      const aprobados = new Set(
        documentos
          .filter((item) => item.estadoRevision === EstadoRevision.APROBADO)
          .map((item) => item.tipo),
      );
      const nivel1Completo = tiposNivel1.every((tipo) => aprobados.has(tipo));
      const rejap = documentos.find(
        (item) => item.tipo === TipoDocumento.REJAP,
      );
      const antecedentesVigentes = Boolean(
        rejap?.venceEn && rejap.venceEn >= hoyISO(),
      );
      const nivel2Completo =
        nivel1Completo &&
        aprobados.has(TipoDocumento.REJAP) &&
        antecedentesVigentes &&
        Boolean(perfil.usuario?.cuentaBancaria);
      perfil.nivelVerificacion = nivel2Completo ? 2 : nivel1Completo ? 1 : 0;
      perfil.venceAntecedentes = rejap?.venceEn ?? perfil.venceAntecedentes;
      if (
        perfil.estado === EstadoTrabajador.PENDIENTE ||
        perfil.estado === EstadoTrabajador.ACTIVO
      ) {
        perfil.estado = nivel2Completo
          ? EstadoTrabajador.ACTIVO
          : EstadoTrabajador.PENDIENTE;
      }
      await manager.save(PerfilTrabajador, perfil);

      return {
        mensaje:
          dto.decision === DecisionRevision.APROBAR
            ? 'Documento aprobado'
            : dto.decision === DecisionRevision.RECHAZAR
              ? 'Documento rechazado'
              : 'Se solicitaron nuevos datos al trabajador',
        perfil_id: perfil.id,
        estado: perfil.estado,
        nivel_verificacion: perfil.nivelVerificacion,
        decide: dto.decision,
        documentos: documentos.map((item) => toDocumentoRevision(item, true)),
      };
    });
  }

  private resolverVenceAntecedentes(
    perfil: PerfilTrabajador,
    fechaIndicada?: string,
  ): string {
    if (fechaIndicada) {
      return fechaIndicada;
    }
    if (perfil.venceAntecedentes && perfil.venceAntecedentes > hoyISO()) {
      return perfil.venceAntecedentes;
    }
    return sumarAniosISO(new Date(), 1);
  }

  private async reemplazarDocumentos(
    manager: EntityManager,
    trabajadorId: string,
    documentos: Array<{
      tipo: TipoDocumento;
      archivo: ArchivoSubido;
    }>,
    venceAntecedentes: string,
  ): Promise<void> {
    for (const { tipo, archivo } of documentos) {
      const url = await this.documentStorage.guardar(archivo);
      await manager.delete(Documento, { trabajadorId, tipo });
      const documento = manager.create(Documento, {
        trabajadorId,
        tipo,
        archivoPrivadoUrl: url,
        estadoRevision: EstadoRevision.PENDIENTE,
        motivoRechazo: null,
        revisadoPorId: null,
        venceEn: tipo === TipoDocumento.REJAP ? venceAntecedentes : null,
      });
      await manager.save(Documento, documento);
    }
  }

  private async guardarCuentaBancaria(
    manager: EntityManager,
    usuarioId: string,
    dto: CargarDocumentosDto,
  ): Promise<void> {
    const existente = await manager.findOne(CuentaBancaria, {
      where: { usuarioId },
    });
    const cifrado = cifrarNumeroCuenta(dto.numero_cuenta);
    if (existente) {
      existente.banco = dto.banco;
      existente.numeroCuentaCifrado = cifrado;
      existente.titular = dto.titular;
      await manager.save(CuentaBancaria, existente);
      return;
    }
    const cuenta = manager.create(CuentaBancaria, {
      usuarioId,
      banco: dto.banco,
      numeroCuentaCifrado: cifrado,
      titular: dto.titular,
    });
    await manager.save(CuentaBancaria, cuenta);
  }
}
