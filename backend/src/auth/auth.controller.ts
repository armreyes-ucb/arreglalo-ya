import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import type { UsuarioPublico } from '../common/interfaces/usuario-publico.interface.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegistroDto } from './dto/registro.dto.js';
import { SolicitarCodigoDto } from './dto/solicitar-codigo.dto.js';
import type { AuthTokenResponse } from './interfaces/auth-token-response.interface.js';
import type { SolicitarCodigoResponse } from './interfaces/solicitar-codigo-response.interface.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('solicitar-codigo')
  @HttpCode(HttpStatus.OK)
  solicitarCodigo(
    @Body() dto: SolicitarCodigoDto,
  ): Promise<SolicitarCodigoResponse> {
    return this.authService.solicitarCodigo(dto.telefono);
  }

  @Post('registro')
  registro(@Body() dto: RegistroDto): Promise<UsuarioPublico> {
    return this.authService.registro(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthTokenResponse> {
    return this.authService.login(dto);
  }
}
