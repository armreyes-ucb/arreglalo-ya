import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { BusinessRulesService } from './business-rules.service.js';

describe('BusinessRulesService', () => {
  let service: BusinessRulesService;

  const ahora = new Date(2026, 0, 5, 10, 0, 0);
  const cita3Horas = new Date(2026, 0, 5, 13, 0, 0);
  const cita2Horas = new Date(2026, 0, 5, 12, 0, 0);
  const cita1Hora = new Date(2026, 0, 5, 11, 0, 0);
  const limiteDevolucion = new Date(2026, 0, 8, 10, 0, 0);

  beforeEach(() => {
    service = new BusinessRulesService();
  });

  describe('redondearBs', () => {
    it('RN14: redondea estrictamente a Bs 0.50', () => {
      expect(service.redondearBs(333.25)).toBe(333.5);
      expect(service.redondearBs(333.24)).toBe(333);
    });
  });

  describe('calcularPago', () => {
    it('CP01: calcula un pago normal de Bs 400', () => {
      expect(service.calcularPago(400)).toEqual({
        total: 400,
        pagoInicial25: 100,
        comision5: 20,
        parteTrabajador20: 80,
        saldo75: 300,
      });
    });

    it('CP02: aplica el 10% urgente sobre Bs 400', () => {
      expect(service.calcularPago(400, true)).toEqual({
        total: 440,
        pagoInicial25: 110,
        comision5: 22,
        parteTrabajador20: 88,
        saldo75: 330,
      });
    });

    it('CP03: redondea los montos de un precio de Bs 333', () => {
      expect(service.calcularPago(333)).toEqual({
        total: 333,
        pagoInicial25: 83.5,
        comision5: 16.5,
        parteTrabajador20: 67,
        saldo75: 249.5,
      });
    });

    it('rechaza precios inválidos', () => {
      expect(() => service.calcularPago(0)).toThrow(
        BadRequestException,
      );
      expect(() => service.calcularPago(Number.NaN)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('calcularPrecioFinal', () => {
    it('aplica el 10% urgente y calcula el saldo restante', () => {
      expect(service.calcularPrecioFinal(500, 110, true)).toEqual({
        total: 550,
        saldo75: 440,
      });
    });

    it('permite un precio final igual al pago inicial del 25%', () => {
      expect(service.calcularPrecioFinal(100, 100)).toEqual({
        total: 100,
        saldo75: 0,
      });
    });

    it('rechaza un precio final menor al pago inicial del 25%', () => {
      expect(() => service.calcularPrecioFinal(99.5, 100)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('calcularFechaLimiteDevolucion', () => {
    it('salta sábado y domingo al sumar 3 días hábiles', () => {
      const viernes = new Date(2026, 0, 9, 10, 0, 0);
      expect(
        service.calcularFechaLimiteDevolucion(viernes),
      ).toEqual(new Date(2026, 0, 14, 10, 0, 0));
    });
  });

  describe('diasSuspension', () => {
    it('CP06: aplica la serie de Fibonacci a la cuarta y séptima falta', () => {
      expect(service.diasSuspension(4)).toBe(5);
      expect(service.diasSuspension(7)).toBe(21);
    });

    it('rechaza números de falta inválidos', () => {
      expect(() => service.diasSuspension(0)).toThrow(
        BadRequestException,
      );
      expect(() => service.diasSuspension(1.5)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('evaluarCancelacion', () => {
    it('CP04: el cliente cancela con 3 horas y no hay penalidad', () => {
      expect(
        service.evaluarCancelacion(
          'CLIENTE',
          cita3Horas,
          ahora,
        ),
      ).toEqual({
        horasRestantes: 3,
        penalidad: false,
        devolverPagoInicial: true,
        suspenderTrabajador: false,
        numeroFalta: null,
        diasSuspension: 0,
        fechaLimiteDevolucion: limiteDevolucion,
      });
    });

    it('CP05: el trabajador cancela con 1 hora, primera falta', () => {
      expect(
        service.evaluarCancelacion(
          'TRABAJADOR',
          cita1Hora,
          ahora,
          1,
        ),
      ).toEqual({
        horasRestantes: 1,
        penalidad: true,
        devolverPagoInicial: true,
        suspenderTrabajador: true,
        numeroFalta: 1,
        diasSuspension: 1,
        fechaLimiteDevolucion: limiteDevolucion,
      });
    });

    it('RN03: exactamente 2 horas no genera penalidad', () => {
      const resultado = service.evaluarCancelacion(
        'TRABAJADOR',
        cita2Horas,
        ahora,
      );
      expect(resultado.penalidad).toBe(false);
      expect(resultado.suspenderTrabajador).toBe(false);
      expect(resultado.devolverPagoInicial).toBe(true);
    });

    it('el cliente con menos de 2 horas no recibe devolución', () => {
      expect(
        service.evaluarCancelacion(
          'CLIENTE',
          cita1Hora,
          ahora,
        ),
      ).toEqual({
        horasRestantes: 1,
        penalidad: true,
        devolverPagoInicial: false,
        suspenderTrabajador: false,
        numeroFalta: null,
        diasSuspension: 0,
        fechaLimiteDevolucion: null,
      });
    });

    it('exige numeroFalta solo al trabajador con menos de 2 horas', () => {
      expect(() =>
        service.evaluarCancelacion(
          'TRABAJADOR',
          cita1Hora,
          ahora,
        ),
      ).toThrow(BadRequestException);
    });
  });
});
