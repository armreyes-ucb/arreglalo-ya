import {
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { SmsVerificationService } from './sms-verification.service.js';

function capturarErrorSync(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba un error');
}

describe('SmsVerificationService', () => {
  let service: SmsVerificationService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    service = new SmsVerificationService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('genera un código de 6 dígitos con expiración de 10 minutos', () => {
    const resultado = service.generarCodigo('+59170000001');
    expect(resultado.codigo).toMatch(/^\d{6}$/);
    expect(resultado.expiraEnSegundos).toBe(600);
  });

  it('valida el código correcto una sola vez', () => {
    const { codigo } = service.generarCodigo('+59170000001');
    expect(() =>
      service.validarCodigo('+59170000001', codigo),
    ).not.toThrow();
    expect(() =>
      service.validarCodigo('+59170000001', codigo),
    ).toThrow('Solicita un código');
  });

  it('rechaza el código después de 10 minutos', () => {
    const { codigo } = service.generarCodigo('+59170000001');
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(() =>
      service.validarCodigo('+59170000001', codigo),
    ).toThrow('expiró');
  });

  it('bloquea tras 5 intentos incorrectos', () => {
    const { codigo } = service.generarCodigo('+59170000001');
    const incorrecto = codigo === '000000' ? '111111' : '000000';
    for (let intento = 0; intento < 4; intento += 1) {
      expect(() =>
        service.validarCodigo('+59170000001', incorrecto),
      ).toThrow('incorrecto');
    }
    expect(() =>
      service.validarCodigo('+59170000001', incorrecto),
    ).toThrow('máximo de intentos');
    expect(() =>
      service.validarCodigo('+59170000001', codigo),
    ).toThrow('Solicita un código');
  });

  it('aplica un cooldown de 60 segundos para reenviar', () => {
    service.generarCodigo('+59170000001');
    const error = capturarErrorSync(() =>
      service.generarCodigo('+59170000001'),
    );
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    vi.advanceTimersByTime(60 * 1000);
    expect(() =>
      service.generarCodigo('+59170000001'),
    ).not.toThrow();
  });
});
