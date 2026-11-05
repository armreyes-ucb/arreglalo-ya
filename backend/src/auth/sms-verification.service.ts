import { randomInt } from 'node:crypto';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';

interface CodigoVerificacion {
  codigo: string;
  expiraEn: number;
  intentos: number;
  ultimoEnvio: number;
}

@Injectable()
export class SmsVerificationService {
  private readonly logger = new Logger(SmsVerificationService.name);
  private readonly codigos = new Map<string, CodigoVerificacion>();
  private readonly expiracionMs = 10 * 60 * 1000;
  private readonly maxIntentos = 5;
  private readonly cooldownMs = 60 * 1000;

  generarCodigo(telefono: string): {
    codigo: string;
    expiraEnSegundos: number;
  } {
    const ahora = Date.now();
    this.limpiarExpirados(ahora);
    const existente = this.codigos.get(telefono);
    if (existente && ahora - existente.ultimoEnvio < this.cooldownMs) {
      const segundos = Math.ceil(
        (this.cooldownMs - (ahora - existente.ultimoEnvio)) / 1000,
      );
      throw new HttpException(
        `Espera ${segundos} segundos para solicitar otro código`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const codigo = randomInt(0, 1_000_000).toString().padStart(6, '0');
    this.codigos.set(telefono, {
      codigo,
      expiraEn: ahora + this.expiracionMs,
      intentos: 0,
      ultimoEnvio: ahora,
    });
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`Código SMS mock para ${telefono}: ${codigo}`);
    }
    return {
      codigo,
      expiraEnSegundos: this.expiracionMs / 1000,
    };
  }

  validarCodigo(telefono: string, codigo: string): void {
    const registro = this.codigos.get(telefono);
    if (!registro) {
      throw new BadRequestException(
        'Solicita un código de verificación para este teléfono',
      );
    }
    if (Date.now() >= registro.expiraEn) {
      this.codigos.delete(telefono);
      throw new BadRequestException('El código de verificación expiró');
    }
    if (registro.intentos >= this.maxIntentos) {
      this.codigos.delete(telefono);
      throw new BadRequestException(
        'Se superó el máximo de intentos. Solicita un nuevo código',
      );
    }
    if (registro.codigo !== codigo) {
      registro.intentos += 1;
      if (registro.intentos >= this.maxIntentos) {
        this.codigos.delete(telefono);
        throw new BadRequestException(
          'Se superó el máximo de intentos. Solicita un nuevo código',
        );
      }
      throw new BadRequestException('Código de verificación incorrecto');
    }
    this.codigos.delete(telefono);
  }

  private limpiarExpirados(ahora: number): void {
    for (const [telefono, registro] of this.codigos) {
      if (registro.expiraEn <= ahora) {
        this.codigos.delete(telefono);
      }
    }
  }
}
