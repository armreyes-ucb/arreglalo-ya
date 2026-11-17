import bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { ArrayContains, Repository } from 'typeorm';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { toPublicUser } from '../common/mappers/usuario-publico.mapper.js';
import { isUniqueViolation } from '../common/utils/postgres-error.js';
import { normalizarTelefono } from '../common/utils/telefono.js';
import { Usuario } from '../entities/usuario.entity.js';
import type { ActualizarSupervisorDto } from './dto/actualizar-supervisor.dto.js';
import type { CrearSupervisorDto } from './dto/crear-supervisor.dto.js';
import type { SupervisorCreado } from './interfaces/supervisor-creado.interface.js';
import type { UsuarioPublico } from '../common/interfaces/usuario-publico.interface.js';

const BCRYPT_ROUNDS = 12;

/**
 * RF07 / CP16: solo el superadministrador gestiona cuentas de supervisor.
 * Un supervisor se representa con `roles: [CLIENTE, SUPERVISOR]`, lo que
 * le permite seguir usando los flujos de cliente sin crear otra cuenta.
 */
@Injectable()
export class SupervisoresService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async crear(dto: CrearSupervisorDto): Promise<SupervisorCreado> {
    const telefono = normalizarTelefono(dto.telefono);
    const existente = await this.usuarioRepository.findOne({
      where: { telefono },
    });

    if (existente) {
      return this.promover(existente);
    }

    if (!dto.nombre_completo) {
      throw new BadRequestException(
        'El nombre completo es obligatorio para crear un supervisor',
      );
    }

    const passwordTemporal = dto.password ? null : this.generarPassword();
    const passwordHash = await bcrypt.hash(
      dto.password ?? passwordTemporal ?? '',
      BCRYPT_ROUNDS,
    );
    const usuario = this.usuarioRepository.create({
      nombreCompleto: dto.nombre_completo,
      telefono,
      passwordHash,
      roles: [Rol.CLIENTE, Rol.SUPERVISOR],
      estado: EstadoUsuario.ACTIVO,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      aceptoTerminos: true,
    });

    try {
      const guardado = await this.usuarioRepository.save(usuario);
      return {
        supervisor: toPublicUser(guardado),
        password_temporal: passwordTemporal,
        creado: true,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'El teléfono ya está registrado. Inicia sesión.',
        );
      }
      throw error;
    }
  }

  async listar(): Promise<UsuarioPublico[]> {
    const supervisores = await this.usuarioRepository.find({
      where: { roles: ArrayContains([Rol.SUPERVISOR]) },
      order: { nombreCompleto: 'ASC' },
    });
    return supervisores.map(toPublicUser);
  }

  async actualizar(
    id: string,
    dto: ActualizarSupervisorDto,
  ): Promise<UsuarioPublico> {
    const usuario = await this.buscarSupervisor(id);
    if (dto.nombre_completo !== undefined) {
      usuario.nombreCompleto = dto.nombre_completo;
    }
    if (dto.password !== undefined) {
      usuario.passwordHash = await bcrypt.hash(
        dto.password,
        BCRYPT_ROUNDS,
      );
    }
    const guardado = await this.usuarioRepository.save(usuario);
    return toPublicUser(guardado);
  }

  /**
   * RF07: la desactivación usa `estado = BLOQUEADO`; el JWT deja de ser
   * aceptado de inmediato y el rol se conserva para una futura reactivación.
   */
  async desactivar(
    id: string,
    actorId: string,
  ): Promise<UsuarioPublico> {
    if (id === actorId) {
      throw new ForbiddenException(
        'No puedes desactivar tu propia cuenta',
      );
    }
    const usuario = await this.buscarSupervisor(id);
    usuario.estado = EstadoUsuario.BLOQUEADO;
    const guardado = await this.usuarioRepository.save(usuario);
    return toPublicUser(guardado);
  }

  async reactivar(id: string): Promise<UsuarioPublico> {
    const usuario = await this.buscarSupervisor(id);
    usuario.estado = EstadoUsuario.ACTIVO;
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null;
    const guardado = await this.usuarioRepository.save(usuario);
    return toPublicUser(guardado);
  }

  private async promover(
    usuario: Usuario,
  ): Promise<SupervisorCreado> {
    if (usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new ConflictException(
        'La cuenta con ese teléfono está bloqueada o anonimizada',
      );
    }
    if (usuario.roles.includes(Rol.SUPERVISOR)) {
      throw new ConflictException(
        'El usuario ya es supervisor',
      );
    }

    usuario.roles = [...usuario.roles, Rol.SUPERVISOR];
    if (!usuario.roles.includes(Rol.CLIENTE)) {
      usuario.roles = [Rol.CLIENTE, ...usuario.roles];
    }
    const guardado = await this.usuarioRepository.save(usuario);
    return {
      supervisor: toPublicUser(guardado),
      password_temporal: null,
      creado: false,
    };
  }

  private async buscarSupervisor(id: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
    });
    if (!usuario || !usuario.roles.includes(Rol.SUPERVISOR)) {
      throw new NotFoundException('Supervisor no encontrado');
    }
    return usuario;
  }

  private generarPassword(): string {
    return randomBytes(9).toString('base64url');
  }
}
