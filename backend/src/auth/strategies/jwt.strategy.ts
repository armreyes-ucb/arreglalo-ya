import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface.js';
import { Usuario } from '../../entities/usuario.entity.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: payload.sub },
    });
    if (!usuario) {
      throw new UnauthorizedException('Sesión inválida');
    }
    if (usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new UnauthorizedException('Cuenta no activa');
    }
    if (!payload.rolActivo || !usuario.roles.includes(payload.rolActivo)) {
      throw new UnauthorizedException('Rol no habilitado');
    }
    return {
      id: usuario.id,
      telefono: usuario.telefono,
      roles: usuario.roles,
      rolActivo: payload.rolActivo,
    };
  }
}
