import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  Repository,
  type EntityManager,
} from 'typeorm';
import { ESTADOS_SOLICITUD_EN_CURSO } from '../common/constants/estados.js';
import { AccionPausa } from '../common/enums/accion-pausa.enum.js';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoOferta } from '../common/enums/estado-oferta.enum.js';
import { EstadoRevision } from '../common/enums/estado-revision.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { TipoDocumento } from '../common/enums/tipo-documento.enum.js';
import { toPerfilTrabajadorPropio } from '../common/mappers/perfil-trabajador-propio.mapper.js';
import { toTrabajadorMatch } from '../common/mappers/trabajador-match.mapper.js';
import { toTrabajadorPerfilPublico } from '../common/mappers/trabajador-perfil-publico.mapper.js';
import { sumarDias } from '../common/utils/fechas.js';
import { DIAS_PARA_BAJA_AUTOMATICA } from '../common/utils/pausa.js';
import { evaluarTrabajadorParaOferta } from '../common/utils/rn10.js';
import { Documento } from '../entities/documento.entity.js';
import { Oferta } from '../entities/oferta.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { Suspension } from '../entities/suspension.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import { Zona } from '../entities/zona.entity.js';
import type { ActualizarPerfilTrabajadorDto } from './dto/actualizar-perfil-trabajador.dto.js';
import type { BuscarTrabajadoresQueryDto } from './dto/buscar-trabajadores-query.dto.js';
import type { CambiarPausaDto } from './dto/cambiar-pausa.dto.js';
import type { PerfilTrabajadorPropio } from './interfaces/perfil-trabajador-propio.interface.js';
import type { TrabajadorMatch } from './interfaces/trabajador-match.interface.js';
import type { TrabajadorPerfilPublico } from './interfaces/trabajador-perfil-publico.interface.js';

const CAMPOS_PRECIO_VALIDOS = new Set<string>(
  Object.values(EspecialidadTipo),
);

@Injectable()
export class TrabajadoresService {
  private readonly logger = new Logger(TrabajadoresService.name);

  constructor(
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    @InjectRepository(TrabajadorZona)
    private readonly trabajadorZonaRepository: Repository<TrabajadorZona>,
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    @InjectRepository(Suspension)
    private readonly suspensionRepository: Repository<Suspension>,
    private readonly dataSource: DataSource,
    @InjectRepository(Solicitud)
    private readonly solicitudRepository: Repository<Solicitud>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async obtenerPerfilPropio(
    usuarioId: string,
  ): Promise<PerfilTrabajadorPropio> {
    const perfil = await this.buscarPerfilPorUsuario(usuarioId);
    const zonas = await this.zonasDePerfil(perfil.id);
    const fotos = await this.fotosDePerfil(perfil.id);
    return toPerfilTrabajadorPropio(perfil, zonas, fotos);
  }

  async actualizarPerfil(
    usuarioId: string,
    dto: ActualizarPerfilTrabajadorDto,
  ): Promise<PerfilTrabajadorPropio> {
    await this.dataSource.transaction(async (manager) => {
      const perfil = await this.obtenerOCrearPerfil(manager, usuarioId);

      if (dto.especialidades !== undefined) {
        perfil.especialidades = dto.especialidades;
      }
      if (dto.horarios !== undefined) {
        perfil.horarios = dto.horarios;
      }
      if (dto.precios_estimados !== undefined) {
        perfil.preciosEstimados = this.validarPrecios(
          dto.precios_estimados,
        );
      }
      await manager.save(PerfilTrabajador, perfil);

      if (dto.zonas_ids !== undefined) {
        await this.reemplazarZonas(
          manager,
          perfil.id,
          dto.zonas_ids,
        );
      }
      if (dto.fotos_urls !== undefined) {
        await this.reemplazarFotos(
          manager,
          perfil.id,
          dto.fotos_urls,
        );
      }
    });

    return this.obtenerPerfilPropio(usuarioId);
  }

  async buscarTrabajadores(
    query: BuscarTrabajadoresQueryDto,
  ): Promise<TrabajadorMatch[]> {
    return this.listarTrabajadores(
      query.zona_id,
      query.especialidad,
      true,
    );
  }

  async obtenerPerfilPublico(
    perfilId: string,
  ): Promise<TrabajadorPerfilPublico> {
    const perfil = await this.perfilRepository.findOne({
      where: { id: perfilId },
      relations: {
        usuario: {
          cuentaBancaria: true,
        },
      },
    });
    if (!perfil || !perfil.usuario) {
      throw new NotFoundException('Trabajador no encontrado');
    }
    const evaluacion = evaluarTrabajadorParaOferta(
      perfil,
      Boolean(perfil.usuario.cuentaBancaria),
    );
    if (!evaluacion.puedeOfertar) {
      throw new NotFoundException('Trabajador no disponible');
    }
    const [zonas, fotos] = await Promise.all([
      this.zonasDePerfil(perfil.id),
      this.fotosDePerfil(perfil.id),
    ]);
    return toTrabajadorPerfilPublico(perfil, zonas, fotos);
  }

  async listarCandidatos(
    zonaId: number,
    especialidad?: EspecialidadTipo,
  ): Promise<TrabajadorMatch[]> {
    return this.listarTrabajadores(zonaId, especialidad, true);
  }

  /** RF05: pausa voluntaria (máximo 30 días) o reactivación. */
  async cambiarPausa(
    usuarioId: string,
    dto: CambiarPausaDto,
  ): Promise<PerfilTrabajadorPropio> {
    return dto.accion === AccionPausa.REACTIVAR
      ? this.reactivarPausa(usuarioId)
      : this.pausar(usuarioId);
  }

  /** RF05: solo puede pausar un trabajador activo y sin trabajos en curso. */
  async pausar(usuarioId: string): Promise<PerfilTrabajadorPropio> {
    const perfil = await this.buscarPerfilPorUsuario(usuarioId);

    if (perfil.estado === EstadoTrabajador.PAUSADO) {
      throw new BadRequestException('La cuenta ya está en pausa');
    }
    if (perfil.estado === EstadoTrabajador.SUSPENDIDO) {
      throw new BadRequestException(
        'No puedes pausar una cuenta suspendida',
      );
    }
    if (perfil.estado === EstadoTrabajador.BAJA) {
      throw new BadRequestException(
        'El rol de trabajador fue dado de baja',
      );
    }
    if (perfil.estado !== EstadoTrabajador.ACTIVO) {
      throw new BadRequestException(
        'Debes completar la verificación antes de pausar tu cuenta',
      );
    }

    const trabajos = await this.solicitudRepository.find({
      where: {
        trabajadorConfirmadoId: perfil.id,
        estado: In(ESTADOS_SOLICITUD_EN_CURSO),
      },
      select: { id: true },
    });
    if (trabajos.length > 0) {
      throw new BadRequestException(
        `Tienes ${trabajos.length} trabajo(s) en curso; termínalos antes de pausar tu cuenta`,
      );
    }

    const ofertasElegidas = await this.ofertaRepository.find({
      where: {
        trabajadorId: perfil.id,
        estado: EstadoOferta.ELEGIDA,
      },
      select: { solicitudId: true },
    });
    if (ofertasElegidas.length > 0) {
      const pendientesDePago = await this.solicitudRepository.find({
        where: {
          id: In(
            ofertasElegidas.map((oferta) => oferta.solicitudId),
          ),
          estado: EstadoSolicitud.PENDIENTE_PAGO,
        },
        select: { id: true },
      });
      if (pendientesDePago.length > 0) {
        throw new BadRequestException(
          'Tienes una oferta elegida pendiente de pago; espera la confirmación del cliente',
        );
      }
    }

    perfil.estado = EstadoTrabajador.PAUSADO;
    perfil.fechaPausa = new Date();
    await this.perfilRepository.save(perfil);

    return this.obtenerPerfilPropio(usuarioId);
  }

  /** RF05: reactivación voluntaria antes de la baja automática (RN09). */
  async reactivarPausa(
    usuarioId: string,
  ): Promise<PerfilTrabajadorPropio> {
    const perfil = await this.buscarPerfilPorUsuario(usuarioId);

    if (perfil.estado === EstadoTrabajador.BAJA) {
      throw new BadRequestException(
        'El rol de trabajador fue dado de baja; vuelve a activarlo',
      );
    }
    if (perfil.estado !== EstadoTrabajador.PAUSADO) {
      throw new BadRequestException('La cuenta no está en pausa');
    }

    perfil.estado = EstadoTrabajador.ACTIVO;
    perfil.fechaPausa = null;
    await this.perfilRepository.save(perfil);

    return this.obtenerPerfilPropio(usuarioId);
  }

  /**
   * RN09 / CP12: a los 60 días de pausa (30 + otros 30 sin reactivar) se
   * da de baja el rol de trabajador, conservando el rol de cliente.
   */
  async procesarPausasVencidas(
    ahora: Date = new Date(),
  ): Promise<number> {
    const pausados = await this.perfilRepository.find({
      where: { estado: EstadoTrabajador.PAUSADO },
    });

    let dadosDeBaja = 0;
    for (const perfil of pausados) {
      if (!perfil.fechaPausa) {
        continue;
      }
      const limite = sumarDias(
        perfil.fechaPausa,
        DIAS_PARA_BAJA_AUTOMATICA,
      );
      if (limite.getTime() > ahora.getTime()) {
        continue;
      }

      perfil.estado = EstadoTrabajador.BAJA;
      await this.perfilRepository.save(perfil);

      const usuario = await this.usuarioRepository.findOne({
        where: { id: perfil.usuarioId },
      });
      if (usuario?.roles.includes(Rol.TRABAJADOR)) {
        await this.usuarioRepository.update(usuario.id, {
          roles: usuario.roles.filter(
            (rol) => rol !== Rol.TRABAJADOR,
          ),
        });
      }
      dadosDeBaja += 1;
    }

    return dadosDeBaja;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async procesarPausasVencidasProgramado(): Promise<void> {
    try {
      const dadosDeBaja = await this.procesarPausasVencidas();
      if (dadosDeBaja > 0) {
        this.logger.log(
          `Roles de trabajador dados de baja por inactividad: ${dadosDeBaja}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'No se pudo procesar las pausas vencidas',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async reactivarSuspensionesVencidas(): Promise<number> {
    const suspendidos = await this.perfilRepository.find({
      where: { estado: EstadoTrabajador.SUSPENDIDO },
    });

    let reactivados = 0;
    for (const perfil of suspendidos) {
      const ultima = await this.suspensionRepository.findOne({
        where: { trabajadorId: perfil.id },
        order: { fin: 'DESC' },
      });
      if (!ultima || ultima.fin.getTime() > Date.now()) {
        continue;
      }
      perfil.estado = EstadoTrabajador.ACTIVO;
      await this.perfilRepository.save(perfil);
      reactivados += 1;
    }

    return reactivados;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async reactivarSuspensionesVencidasProgramado(): Promise<void> {
    try {
      const reactivados =
        await this.reactivarSuspensionesVencidas();
      if (reactivados > 0) {
        this.logger.log(
          `Trabajadores reactivados tras suspensión: ${reactivados}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'No se pudo reactivar las suspensiones vencidas',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async buscarPerfilPorUsuario(
    usuarioId: string,
  ): Promise<PerfilTrabajador> {
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
    return perfil;
  }

  private async obtenerOCrearPerfil(
    manager: EntityManager,
    usuarioId: string,
  ): Promise<PerfilTrabajador> {
    const usuario = await manager.findOne(Usuario, {
      where: { id: usuarioId },
      relations: { perfilTrabajador: true },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (usuario.perfilTrabajador) {
      return usuario.perfilTrabajador;
    }
    const perfil = manager.create(PerfilTrabajador, {
      usuarioId,
      especialidades: [],
      horarios: null,
      preciosEstimados: {},
      nivelVerificacion: 0,
      promedio: 0,
      trabajosCompletados: 0,
      aceptoContratoDigital: false,
      estado: EstadoTrabajador.PENDIENTE,
      fechaPausa: null,
      venceAntecedentes: null,
    });
    return manager.save(PerfilTrabajador, perfil);
  }

  private validarPrecios(
    precios: Record<string, number>,
  ): Record<string, number> {
    const entradas = Object.entries(precios);
    for (const [especialidad, precio] of entradas) {
      if (!CAMPOS_PRECIO_VALIDOS.has(especialidad)) {
        throw new BadRequestException(
          `Especialidad inválida en precios_estimados: ${especialidad}`,
        );
      }
      if (
        typeof precio !== 'number' ||
        !Number.isFinite(precio) ||
        precio <= 0
      ) {
        throw new BadRequestException(
          `El precio estimado de ${especialidad} debe ser mayor a 0`,
        );
      }
    }
    return { ...precios };
  }

  private async reemplazarZonas(
    manager: EntityManager,
    perfilId: string,
    zonaIds: number[],
  ): Promise<void> {
    if (zonaIds.length === 0) {
      throw new BadRequestException(
        'Debe registrar al menos una zona de trabajo',
      );
    }
    const zonas = await manager.find(Zona, {
      where: { id: In(zonaIds) },
    });
    if (zonas.length !== new Set(zonaIds).size) {
      throw new BadRequestException('Una o más zonas no existen');
    }
    await manager.delete(TrabajadorZona, { trabajadorId: perfilId });
    const relaciones = zonaIds.map((zonaId) =>
      manager.create(TrabajadorZona, {
        trabajadorId: perfilId,
        zonaId,
      }),
    );
    await manager.save(TrabajadorZona, relaciones);
  }

  private async reemplazarFotos(
    manager: EntityManager,
    perfilId: string,
    fotosUrls: string[],
  ): Promise<void> {
    await manager.delete(Documento, {
      trabajadorId: perfilId,
      tipo: TipoDocumento.FOTO_TRABAJO,
    });
    if (fotosUrls.length === 0) {
      return;
    }
    const fotos = fotosUrls.map((url) =>
      manager.create(Documento, {
        trabajadorId: perfilId,
        tipo: TipoDocumento.FOTO_TRABAJO,
        archivoPrivadoUrl: url,
        estadoRevision: EstadoRevision.APROBADO,
        motivoRechazo: null,
        revisadoPorId: null,
        venceEn: null,
      }),
    );
    await manager.save(Documento, fotos);
  }

  private async zonasDePerfil(perfilId: string): Promise<Zona[]> {
    return this.zonasDeVariosPerfiles([perfilId]).then(
      (mapa) => mapa.get(perfilId) ?? [],
    );
  }

  private async zonasDeVariosPerfiles(
    perfilIds: string[],
  ): Promise<Map<string, Zona[]>> {
    const mapa = new Map<string, Zona[]>();
    if (perfilIds.length === 0) {
      return mapa;
    }
    const relaciones = await this.trabajadorZonaRepository.find({
      where: { trabajadorId: In(perfilIds) },
    });
    if (relaciones.length === 0) {
      return mapa;
    }
    const zonas = await this.zonaRepository.find({
      where: { id: In(relaciones.map((relacion) => relacion.zonaId)) },
    });
    const zonasPorId = new Map(zonas.map((zona) => [zona.id, zona]));
    for (const relacion of relaciones) {
      const zona = zonasPorId.get(relacion.zonaId);
      if (!zona) {
        continue;
      }
      const actuales = mapa.get(relacion.trabajadorId) ?? [];
      actuales.push(zona);
      mapa.set(relacion.trabajadorId, actuales);
    }
    return mapa;
  }

  private async fotosDePerfil(perfilId: string): Promise<string[]> {
    const fotos = await this.documentoRepository.find({
      where: {
        trabajadorId: perfilId,
        tipo: TipoDocumento.FOTO_TRABAJO,
        estadoRevision: EstadoRevision.APROBADO,
      },
      order: { fechaCarga: 'ASC' },
    });
    return fotos.map((foto) => foto.archivoPrivadoUrl);
  }

  private async fotosDeVariosPerfiles(
    perfilIds: string[],
  ): Promise<Map<string, string[]>> {
    const mapa = new Map<string, string[]>();
    if (perfilIds.length === 0) {
      return mapa;
    }
    const fotos = await this.documentoRepository.find({
      where: {
        trabajadorId: In(perfilIds),
        tipo: TipoDocumento.FOTO_TRABAJO,
        estadoRevision: EstadoRevision.APROBADO,
      },
      order: { fechaCarga: 'ASC' },
    });
    for (const foto of fotos) {
      const actuales = mapa.get(foto.trabajadorId) ?? [];
      actuales.push(foto.archivoPrivadoUrl);
      mapa.set(foto.trabajadorId, actuales);
    }
    return mapa;
  }

  private async listarTrabajadores(
    zonaId: number,
    especialidad: EspecialidadTipo | undefined,
    soloElegibles: boolean,
  ): Promise<TrabajadorMatch[]> {
    const zona = await this.zonaRepository.findOne({
      where: { id: zonaId },
    });
    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
    }

    const perfiles = await this.perfilRepository.find({
      relations: {
        usuario: {
          cuentaBancaria: true,
        },
      },
    });
    if (perfiles.length === 0) {
      return [];
    }

    const zonasPorPerfil = await this.zonasDeVariosPerfiles(
      perfiles.map((perfil) => perfil.id),
    );
    const fotosPorPerfil = await this.fotosDeVariosPerfiles(
      perfiles.map((perfil) => perfil.id),
    );

    const candidatos: Array<{
      perfil: PerfilTrabajador;
      zonas: Zona[];
      distancia: number;
    }> = [];

    for (const perfil of perfiles) {
      if (
        especialidad &&
        !perfil.especialidades.includes(especialidad)
      ) {
        continue;
      }
      if (soloElegibles) {
        const evaluacion = evaluarTrabajadorParaOferta(
          perfil,
          Boolean(perfil.usuario?.cuentaBancaria),
        );
        if (!evaluacion.puedeOfertar) {
          continue;
        }
      }
      const zonas = zonasPorPerfil.get(perfil.id) ?? [];
      const distancia = this.calcularDistancia(zona, zonas);
      if (distancia === null) {
        continue;
      }
      candidatos.push({ perfil, zonas, distancia });
    }

    candidatos.sort((a, b) => {
      if (a.distancia !== b.distancia) {
        return a.distancia - b.distancia;
      }
      if (b.perfil.promedio !== a.perfil.promedio) {
        return b.perfil.promedio - a.perfil.promedio;
      }
      return (
        b.perfil.trabajosCompletados -
        a.perfil.trabajosCompletados
      );
    });

    return candidatos.map((candidato) =>
      toTrabajadorMatch(
        candidato.perfil,
        candidato.zonas,
        fotosPorPerfil.get(candidato.perfil.id) ?? [],
        candidato.distancia,
      ),
    );
  }

  private calcularDistancia(
    zonaBuscada: Zona,
    zonasTrabajador: Zona[],
  ): number | null {
    if (zonasTrabajador.some((zona) => zona.id === zonaBuscada.id)) {
      return 0;
    }
    if (
      zonasTrabajador.some(
        (zona) => zona.otb === zonaBuscada.otb,
      )
    ) {
      return 0;
    }
    if (
      zonasTrabajador.some(
        (zona) => zona.nombre === zonaBuscada.nombre,
      )
    ) {
      return 1;
    }
    if (
      zonasTrabajador.some((zona) =>
        zonaBuscada.zonasVecinas.includes(zona.nombre),
      )
    ) {
      return 2;
    }
    return null;
  }
}
