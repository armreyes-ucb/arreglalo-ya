import bcrypt from 'bcrypt';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import type { UsuarioPublico } from '../common/interfaces/usuario-publico.interface.js';
import { toPublicUser } from '../common/mappers/usuario-publico.mapper.js';
import { isUniqueViolation } from '../common/utils/postgres-error.js';
import { normalizarTelefono } from '../common/utils/telefono.js';
import { Usuario } from '../entities/usuario.entity.js';
import type { AuthTokenResponse } from './interfaces/auth-token-response.interface.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';
import type { SolicitarCodigoResponse } from './interfaces/solicitar-codigo-response.interface.js';
import { LoginDto } from './dto/login.dto.js';
import { RegistroDto } from './dto/registro.dto.js';
import { SmsVerificationService } from './sms-verification.service.js';

const BCRYPT_ROUNDS = 12;
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsVerificationService: SmsVerificationService,
  ) {}

  async solicitarCodigo(telefono: string): Promise<SolicitarCodigoResponse> {
    const telefonoNormalizado = normalizarTelefono(telefono);
    const existente = await this.usuarioRepo.findOne({
      where: { telefono: telefonoNormalizado },
    });
    if (existente) {
      throw new ConflictException(
        'El teléfono ya está registrado. Inicia sesión.',
      );
    }
    const { codigo, expiraEnSegundos } =
      this.smsVerificationService.generarCodigo(telefonoNormalizado);
    const respuesta: SolicitarCodigoResponse = {
      mensaje: 'Código de verificación generado',
      expira_en_segundos: expiraEnSegundos,
    };
    if (process.env.NODE_ENV !== 'production') {
      respuesta.codigo_desarrollo = codigo;
    }
    return respuesta;
  }

  async registro(dto: RegistroDto): Promise<UsuarioPublico> {
    const telefono = normalizarTelefono(dto.telefono);
    const existente = await this.usuarioRepo.findOne({
      where: { telefono },
    });
    if (existente) {
      throw new ConflictException(
        'El teléfono ya está registrado. Inicia sesión.',
      );
    }
    this.smsVerificationService.validarCodigo(telefono, dto.codigo);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const usuario = this.usuarioRepo.create({
      nombreCompleto: dto.nombre_completo.trim(),
      telefono,
      passwordHash,
      roles: [Rol.CLIENTE],
      estado: EstadoUsuario.ACTIVO,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      aceptoTerminos: true,
    });
    try {
      const guardado = await this.usuarioRepo.save(usuario);
      return toPublicUser(guardado);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'El teléfono ya está registrado. Inicia sesión.',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const telefono = normalizarTelefono(dto.telefono);
    const usuario = await this.usuarioRepo.findOne({
      where: { telefono },
    });
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (usuario.estado === EstadoUsuario.BLOQUEADO) {
      throw new ForbiddenException(
        'Cuenta bloqueada por un administrador',
      );
    }
    if (usuario.estado === EstadoUsuario.ANONIMIZADO) {
      throw new ForbiddenException('Cuenta no disponible');
    }
    const ahora = Date.now();
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta.getTime() > ahora) {
      const minutos = Math.ceil(
        (usuario.bloqueadoHasta.getTime() - ahora) / 60_000,
      );
      throw new HttpException(
        `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutos} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (usuario.bloqueadoHasta) {
      usuario.intentosFallidos = 0;
      usuario.bloqueadoHasta = null;
      await this.usuarioRepo.update(usuario.id, {
        intentosFallidos: 0,
        bloqueadoHasta: null,
      });
    }
    const passwordCorrecta = await bcrypt.compare(
      dto.password,
      usuario.passwordHash,
    );
    if (!passwordCorrecta) {
      const nuevosIntentos = usuario.intentosFallidos + 1;
      if (nuevosIntentos >= MAX_INTENTOS) {
        await this.usuarioRepo.update(usuario.id, {
          intentosFallidos: MAX_INTENTOS,
          bloqueadoHasta: new Date(Date.now() + BLOQUEO_MS),
        });
        throw new HttpException(
          'Cuenta bloqueada temporalmente por demasiados intentos fallidos.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await this.usuarioRepo.update(usuario.id, {
        intentosFallidos: nuevosIntentos,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (usuario.intentosFallidos !== 0 || usuario.bloqueadoHasta !== null) {
      await this.usuarioRepo.update(usuario.id, {
        intentosFallidos: 0,
        bloqueadoHasta: null,
      });
      usuario.intentosFallidos = 0;
      usuario.bloqueadoHasta = null;
    }
    const rolActivo = usuario.roles.includes(Rol.CLIENTE)
      ? Rol.CLIENTE
      : usuario.roles[0];
    if (!rolActivo) {
      throw new ForbiddenException('La cuenta no tiene roles habilitados');
    }
    return this.emitirToken(usuario, rolActivo);
  }

  async emitirToken(
    usuario: Usuario,
    rolActivo: Rol,
  ): Promise<AuthTokenResponse> {
    if (!usuario.roles.includes(rolActivo)) {
      throw new ForbiddenException(
        `El usuario no tiene el rol ${rolActivo}`,
      );
    }
    const payload: JwtPayload = {
      sub: usuario.id,
      telefono: usuario.telefono,
      roles: usuario.roles,
      rolActivo,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in:
        this.configService.get<string>('JWT_EXPIRES_IN') ?? '7d',
      rol_activo: rolActivo,
      usuario: toPublicUser(usuario),
    };
  }
}
