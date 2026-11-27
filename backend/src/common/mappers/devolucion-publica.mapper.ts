import type { Devolucion } from '../../entities/devolucion.entity.js';
import {
  calcularSaldoDevoluciones,
  redondearMonto,
} from '../utils/devoluciones.js';
import type {
  DevolucionConSaldoPublica,
  DevolucionPublica,
} from '../../pagos/interfaces/devolucion-publica.interface.js';

export function toDevolucionPublica(devolucion: Devolucion): DevolucionPublica {
  return {
    id: devolucion.id,
    pago_id: devolucion.pagoId,
    motivo: devolucion.motivo,
    monto: devolucion.monto,
    fecha_limite: devolucion.fechaLimite,
    estado: devolucion.estado,
  };
}

export function toDevolucionConSaldo(
  devolucion: Devolucion,
  montoOriginal: number,
  totalDevuelto: number,
): DevolucionConSaldoPublica {
  return {
    ...toDevolucionPublica(devolucion),
    monto_original: redondearMonto(montoOriginal),
    total_devuelto: redondearMonto(totalDevuelto),
    saldo_disponible: calcularSaldoDevoluciones(montoOriginal, [totalDevuelto])
      .saldoDisponible,
  };
}
