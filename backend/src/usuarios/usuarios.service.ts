import bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service.js';
import type { AuthTokenResponse } from '../auth/interfaces/auth-token-response.interface.js';
import {
  ESTADOS_DEVOLUCION_ACTIVA,
  ESTADOS_RECLAMO_ABIERTO,
  ESTADOS_SOLICITUD_ACTIVA_CLIENTE,
  ESTADOS_SOLICITUD_EN_CURSO,
} from '../common/constants/estados.js';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { toPublicPerfil } from '../common/mappers/perfil-trabajador-publico.mapper.js';
import { toPublicZona } from '../common/mappers/zona-publica.mapper.js';
import { isUniqueViolation } from '../common/utils/postgres-error.js';
import { CuentaBancaria } from '../entities/cuenta-bancaria.entity.js';
import { Devolucion } from '../entities/devolucion.entity.js';
import { Documento } from '../entities/documento.entity.js';
import { Pago } from '../entities/pago.entity.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Reclamo } from '../entities/reclamo.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import { Zona } from '../entities/zona.entity.js';
import { DocumentStorageService } from '../verificacion/document-storage.service.js';
import { ActivarTrabajadorDto } from './dto/activar-trabajador.dto.js';
import { CambiarRolDto } from './dto/cambiar-rol.dto.js';
import type { EliminarCuentaDto } from './dto/eliminar-cuenta.dto.js';
import type { ActivacionTrabajadorResponse } from './interfaces/activacion-trabajador-response.interface.js';
import type { EliminacionCuentaResponse } from './interfaces/eliminacion-cuenta.interface.js';

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepo: Repository<PerfilTrabajador>,
    @InjectRepository(Zona)
    private readonly zonaRepo: Repository<Zona>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
    private readonly documentStorage: DocumentStorageService,
  ) {}

  async cambiarRol(
    usuarioId: string,
    dto: CambiarRolDto,
  ): Promise<AuthTokenResponse> {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new UnauthorizedException('Sesión inválida');
    }
    if (!usuario.roles.includes(dto.rol)) {
      throw new ForbiddenException(
        `No tienes el rol ${dto.rol} habilitado`,
      );
    }
    if (dto.rol === Rol.TRABAJADOR) {
      const perfil = await this.perfilRepo.findOne({
        where: { usuarioId },
      });
      if (!perfil) {
        throw new ConflictException(
          'Primero activa el rol de trabajador',
        );
      }
      if (perfil.estado === EstadoTrabajador.BAJA) {
        throw new ConflictException(
          'El rol de trabajador fue dado de baja',
        );
      }
    }
    return this.authService.emitirToken(usuario, dto.rol);
  }

  async activarTrabajador(
    usuarioId: string,
    dto: ActivarTrabajadorDto,
  ): Promise<ActivacionTrabajadorResponse> {
    if (!dto.acepto_contrato_digital) {
      throw new BadRequestException('Debe aceptar el contrato digital');
    }
    if (!dto.especialidades.length) {
      throw new BadRequestException(
        'Debe elegir al menos una especialidad',
      );
    }
    if (!dto.zonas.length) {
      throw new BadRequestException('Debe elegir al menos una zona');
    }
    const usuario = await this.usuarioRepo.findOne({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new UnauthorizedException('Sesión inválida');
    }
    if (!usuario.roles.includes(Rol.CLIENTE)) {
      throw new ForbiddenException(
        'Se requiere el rol CLIENTE para activar el rol de trabajador',
      );
    }
    const perfilExistente = await this.perfilRepo.findOne({
      where: { usuarioId },
    });
    if (perfilExistente) {
      throw new ConflictException('El perfil de trabajador ya existe');
    }
    const zonas = await this.zonaRepo.findBy({ id: In(dto.zonas) });
    if (zonas.length !== dto.zonas.length) {
      const encontradas = new Set(zonas.map((zona) => zona.id));
      const faltantes = dto.zonas.filter((id) => !encontradas.has(id));
      throw new BadRequestException(
        `Zonas no encontradas: ${faltantes.join(', ')}`,
      );
    }
    try {
      const resultado = await this.dataSource.transaction(
        async (manager) => {
          const perfil = manager.create(PerfilTrabajador, {
            usuarioId,
            especialidades: dto.especialidades,
            horarios: null,
            preciosEstimados: {},
            nivelVerificacion: 0,
            promedio: 0,
            trabajosCompletados: 0,
            aceptoContratoDigital: true,
            estado: EstadoTrabajador.PENDIENTE,
            fechaPausa: null,
            venceAntecedentes: null,
          });
          const perfilGuardado = await manager.save(perfil);
          await manager.insert(
            TrabajadorZona,
            zonas.map((zona) => ({
              trabajadorId: perfilGuardado.id,
              zonaId: zona.id,
            })),
          );
          const roles = usuario.roles.includes(Rol.TRABAJADOR)
            ? usuario.roles
            : [...usuario.roles, Rol.TRABAJADOR];
          await manager.update(Usuario, usuarioId, { roles });
          const usuarioActualizado = await manager.findOneOrFail(
            Usuario,
            { where: { id: usuarioId } },
          );
          return { perfil: perfilGuardado, usuario: usuarioActualizado };
        },
      );
      const token = await this.authService.emitirToken(
        resultado.usuario,
        Rol.TRABAJADOR,
      );
      return {
        ...token,
        perfil: toPublicPerfil(resultado.perfil),
        zonas: zonas.map(toPublicZona),
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'El perfil de trabajador ya existe',
        );
      }
      throw error;
    }
  }

  /**
   * RF06 / CP22: anonimiza la cuenta si no hay solicitudes, pagos,
   * devoluciones ni reclamos activos. Los registros contables se conservan.
   */
  async eliminarCuenta(
    usuarioId: string,
    dto: EliminarCuentaDto,
  ): Promise<EliminacionCuentaResponse> {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new UnauthorizedException('Sesión inválida');
    }
    if (usuario.estado === EstadoUsuario.ANONIMIZADO) {
      return { anonimizado: true, ya_anonimizado: true };
    }

    const passwordCorrecta = await bcrypt.compare(
      dto.password,
      usuario.passwordHash,
    );
    if (!passwordCorrecta) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const documentos = await this.dataSource.transaction(
      async (manager) => {
        const perfil = await manager.findOne(PerfilTrabajador, {
          where: { usuarioId },
        });

        const solicitudesCliente = await manager.find(Solicitud, {
          where: {
            clienteId: usuarioId,
            estado: In(ESTADOS_SOLICITUD_ACTIVA_CLIENTE),
          },
          select: { id: true },
        });
        const solicitudesTrabajador = perfil
          ? await manager.find(Solicitud, {
              where: {
                trabajadorConfirmadoId: perfil.id,
                estado: In(ESTADOS_SOLICITUD_EN_CURSO),
              },
              select: { id: true },
            })
          : [];

        if (
          solicitudesCliente.length > 0 ||
          solicitudesTrabajador.length > 0
        ) {
          throw new ConflictException(
            'No puedes eliminar tu cuenta con solicitudes activas',
          );
        }

        const solicitudes = await manager.find(Solicitud, {
          where: [
            { clienteId: usuarioId },
            ...(perfil
              ? [{ trabajadorConfirmadoId: perfil.id }]
              : []),
          ],
          select: { id: true },
        });
        const solicitudIds = solicitudes.map(
          (solicitud) => solicitud.id,
        );

        if (solicitudIds.length > 0) {
          const pagos = await manager.find(Pago, {
            where: { solicitudId: In(solicitudIds) },
          });
          const pagosActivos = pagos.filter(
            (pago) =>
              pago.estadoQr === EstadoQr.PENDIENTE ||
              (pago.estadoQr === EstadoQr.PAGADO &&
                !pago.transferidoAlTrabajador),
          );
          if (pagosActivos.length > 0) {
            throw new ConflictException(
              'No puedes eliminar tu cuenta con pagos pendientes',
            );
          }

          const pagoIds = pagos.map((pago) => pago.id);
          const devoluciones =
            pagoIds.length > 0
              ? await manager.find(Devolucion, {
                  where: {
                    pagoId: In(pagoIds),
                    estado: In(ESTADOS_DEVOLUCION_ACTIVA),
                  },
                })
              : [];
          if (devoluciones.length > 0) {
            throw new ConflictException(
              'No puedes eliminar tu cuenta con devoluciones en curso',
            );
          }

          const reclamos = await manager.find(Reclamo, {
            where: {
              solicitudId: In(solicitudIds),
              estado: In(ESTADOS_RECLAMO_ABIERTO),
            },
          });
          if (reclamos.length > 0) {
            throw new ConflictException(
              'No puedes eliminar tu cuenta con reclamos abiertos',
            );
          }
        }

        const documentosDelPerfil = perfil
          ? await manager.find(Documento, {
              where: { trabajadorId: perfil.id },
            })
          : [];

        if (perfil) {
          perfil.estado = EstadoTrabajador.BAJA;
          perfil.fechaPausa = null;
          perfil.horarios = null;
          perfil.preciosEstimados = {};
          await manager.save(PerfilTrabajador, perfil);
          await manager.delete(TrabajadorZona, {
            trabajadorId: perfil.id,
          });
          await manager.delete(Documento, {
            trabajadorId: perfil.id,
          });
        }

        await manager.delete(CuentaBancaria, { usuarioId });

        await manager.update(Usuario, usuarioId, {
          nombreCompleto: 'Usuario anónimo',
          telefono: this.telefonoAnonimo(usuarioId),
          passwordHash: 'ANONIMIZADO',
          estado: EstadoUsuario.ANONIMIZADO,
          intentosFallidos: 0,
          bloqueadoHasta: null,
        });

        return documentosDelPerfil.map(
          (documento) => documento.archivoPrivadoUrl,
        );
      },
    );

    await this.eliminarArchivos(documentos);

    return { anonimizado: true, ya_anonimizado: false };
  }

  private telefonoAnonimo(usuarioId: string): string {
    return `ANON-${usuarioId
      .replace(/-/g, '')
      .slice(0, 12)
      .toUpperCase()}`;
  }

  /** D9: el borrado físico es best-effort y nunca revierte la anonimización. */
  private async eliminarArchivos(urls: string[]): Promise<void> {
    for (const url of urls) {
      try {
        const eliminado = await this.documentStorage.eliminar(url);
        if (!eliminado) {
          this.logger.warn(
            `No se encontró el archivo privado ${url} al anonimizar la cuenta`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar el archivo privado ${url}: ${
            error instanceof Error ? error.message : 'error desconocido'
          }`,
        );
      }
    }
  }
}
