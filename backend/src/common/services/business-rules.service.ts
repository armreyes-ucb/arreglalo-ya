import { BadRequestException, Injectable } from '@nestjs/common';

export type ActorCancelacion = 'CLIENTE' | 'TRABAJADOR';

export interface ResultadoPago {
  total: number;
  pagoInicial25: number;
  comision5: number;
  parteTrabajador20: number;
  saldo75: number;
}

export interface ResultadoCancelacion {
  horasRestantes: number;
  penalidad: boolean;
  devolverPagoInicial: boolean;
  suspenderTrabajador: boolean;
  numeroFalta: number | null;
  diasSuspension: number;
  fechaLimiteDevolucion: Date | null;
}

export interface ResultadoPrecioFinal {
  total: number;
  saldo75: number;
}

/** RF34: parámetros vigentes al generar el QR (CP35). */
export interface ParametrosPago {
  comisionPct?: number;
  pagoInicialPct?: number;
  factorUrgente?: number;
}

export interface ParametrosCancelacion {
  horasSinPenalidad?: number;
  diasHabilesDevolucion?: number;
}

@Injectable()
export class BusinessRulesService {
  redondearBs(valor: number): number {
    if (!Number.isFinite(valor)) {
      throw new BadRequestException(
        'El monto debe ser un número finito',
      );
    }
    return Math.round(valor * 2) / 2;
  }

  calcularPago(
    precio: number,
    urgente = false,
    parametros: ParametrosPago = {},
  ): ResultadoPago {
    if (!Number.isFinite(precio) || precio <= 0) {
      throw new BadRequestException(
        'El precio debe ser mayor a 0',
      );
    }

    const factorUrgente = parametros.factorUrgente ?? 1.1;
    const comisionPct = parametros.comisionPct ?? 5;
    const pagoInicialPct = parametros.pagoInicialPct ?? 25;
    this.validarPorcentajes(comisionPct, pagoInicialPct, factorUrgente);

    const total = this.redondearBs(
      urgente ? precio * factorUrgente : precio,
    );
    const pagoInicial25 = this.redondearBs(
      total * (pagoInicialPct / 100),
    );
    const comision5 = this.redondearBs(
      total * (comisionPct / 100),
    );
    const parteTrabajador20 = pagoInicial25 - comision5;
    const saldo75 = this.redondearBs(
      total - pagoInicial25,
    );

    return {
      total,
      pagoInicial25,
      comision5,
      parteTrabajador20,
      saldo75,
    };
  }

  calcularPrecioFinal(
    precioFinal: number,
    pagoInicial25: number,
    urgente = false,
    factorUrgente = 1.1,
  ): ResultadoPrecioFinal {
    if (!Number.isFinite(precioFinal) || precioFinal <= 0) {
      throw new BadRequestException(
        'El precio final debe ser mayor a 0',
      );
    }
    if (
      !Number.isFinite(pagoInicial25) ||
      pagoInicial25 < 0
    ) {
      throw new BadRequestException(
        'El pago inicial no es válido',
      );
    }
    if (!Number.isFinite(factorUrgente) || factorUrgente < 1) {
      throw new BadRequestException(
        'El factor de urgencia no es válido',
      );
    }

    const total = this.redondearBs(
      urgente ? precioFinal * factorUrgente : precioFinal,
    );
    if (total < pagoInicial25) {
      throw new BadRequestException(
        'El precio final no puede ser menor al pago inicial del 25%',
      );
    }

    return {
      total,
      saldo75: this.redondearBs(total - pagoInicial25),
    };
  }

  calcularFechaLimiteDevolucion(
    desde: Date = new Date(),
    dias = 3,
  ): Date {
    if (!Number.isFinite(desde.getTime())) {
      throw new BadRequestException(
        'La fecha de devolución no es válida',
      );
    }
    if (!Number.isInteger(dias) || dias < 0) {
      throw new BadRequestException(
        'Los días hábiles deben ser un entero mayor o igual a 0',
      );
    }
    return this.sumarDiasHabiles(desde, dias);
  }

  diasSuspension(numeroFalta: number): number {
    if (!Number.isInteger(numeroFalta) || numeroFalta < 1) {
      throw new BadRequestException(
        'El número de falta debe ser un entero mayor o igual a 1',
      );
    }

    let a = 1;
    let b = 2;
    for (let i = 1; i < numeroFalta; i++) {
      [a, b] = [b, a + b];
    }
    return a;
  }

  evaluarCancelacion(
    quien: ActorCancelacion,
    cita: Date,
    ahora: Date,
    numeroFalta?: number,
    parametros: ParametrosCancelacion = {},
  ): ResultadoCancelacion {
    if (
      !Number.isFinite(cita.getTime()) ||
      !Number.isFinite(ahora.getTime())
    ) {
      throw new BadRequestException(
        'Las fechas de la cancelación no son válidas',
      );
    }

    const horasSinPenalidad =
      parametros.horasSinPenalidad ?? 2;
    const diasDevolucion =
      parametros.diasHabilesDevolucion ?? 3;
    const horasRestantes =
      (cita.getTime() - ahora.getTime()) / 3_600_000;

    if (horasRestantes >= horasSinPenalidad) {
      return {
        horasRestantes,
        penalidad: false,
        devolverPagoInicial: true,
        suspenderTrabajador: false,
        numeroFalta: null,
        diasSuspension: 0,
        fechaLimiteDevolucion:
          this.calcularFechaLimiteDevolucion(
            ahora,
            diasDevolucion,
          ),
      };
    }

    if (quien === 'TRABAJADOR') {
      if (numeroFalta === undefined) {
        throw new BadRequestException(
          `El número de falta es obligatorio cuando el trabajador cancela con menos de ${horasSinPenalidad} horas`,
        );
      }
      return {
        horasRestantes,
        penalidad: true,
        devolverPagoInicial: true,
        suspenderTrabajador: true,
        numeroFalta,
        diasSuspension: this.diasSuspension(numeroFalta),
        fechaLimiteDevolucion:
          this.calcularFechaLimiteDevolucion(
            ahora,
            diasDevolucion,
          ),
      };
    }

    return {
      horasRestantes,
      penalidad: true,
      devolverPagoInicial: false,
      suspenderTrabajador: false,
      numeroFalta: null,
      diasSuspension: 0,
      fechaLimiteDevolucion: null,
    };
  }

  private validarPorcentajes(
    comisionPct: number,
    pagoInicialPct: number,
    factorUrgente: number,
  ): void {
    if (
      !Number.isFinite(comisionPct) ||
      comisionPct < 0 ||
      comisionPct > 100
    ) {
      throw new BadRequestException(
        'La comisión debe estar entre 0 y 100',
      );
    }
    if (
      !Number.isFinite(pagoInicialPct) ||
      pagoInicialPct <= 0 ||
      pagoInicialPct > 100
    ) {
      throw new BadRequestException(
        'El pago inicial debe estar entre 0 y 100',
      );
    }
    if (comisionPct > pagoInicialPct) {
      throw new BadRequestException(
        'La comisión no puede superar el pago inicial',
      );
    }
    if (!Number.isFinite(factorUrgente) || factorUrgente < 1) {
      throw new BadRequestException(
        'El factor de urgencia debe ser mayor o igual a 1',
      );
    }
  }

  private sumarDiasHabiles(desde: Date, dias: number): Date {
    const resultado = new Date(desde);
    let agregados = 0;

    while (agregados < dias) {
      resultado.setDate(resultado.getDate() + 1);
      const dia = resultado.getDay();
      if (dia !== 0 && dia !== 6) {
        agregados++;
      }
    }

    return resultado;
  }
}
