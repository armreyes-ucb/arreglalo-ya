import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service.js';
import type { AuthTokenResponse } from '../auth/interfaces/auth-token-response.interface.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { toPublicPerfil } from '../common/mappers/perfil-trabajador-publico.mapper.js';
import { toPublicZona } from '../common/mappers/zona-publica.mapper.js';
import { isUniqueViolation } from '../common/utils/postgres-error.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Usuario } from '../entities/usuario.entity.js';
import { Zona } from '../entities/zona.entity.js';
import { ActivarTrabajadorDto } from './dto/activar-trabajador.dto.js';
import { CambiarRolDto } from './dto/cambiar-rol.dto.js';
import type { ActivacionTrabajadorResponse } from './interfaces/activacion-trabajador-response.interface.js';

@Injectable()
export class UsuariosService {
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
}
