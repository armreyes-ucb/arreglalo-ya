import type { EstadoDevolucion } from '../../common/enums/estado-devolucion.enum.js';
import type { EstadoQr } from '../../common/enums/estado-qr.enum.js';

export interface DevolucionPublica {
  id: string;
  pago_id: string;
  motivo: string;
  monto: number;
  fecha_limite: string;
  estado: EstadoDevolucion;
}

/**
 * Devolución con el contexto del pago: importe original reembolsable
 * (pago inicial del 25%), acumulado de todas sus devoluciones y saldo.
 */
export interface DevolucionConSaldoPublica extends DevolucionPublica {
  monto_original: number;
  total_devuelto: number;
  saldo_disponible: number;
}

/** Pago visible para el supervisor al registrar devoluciones parciales. */
export interface PagoConSaldoPublica {
  pago_id: string;
  solicitud_id: string;
  cliente_id: string;
  estado_qr: EstadoQr;
  monto_original: number;
  total_devuelto: number;
  saldo_disponible: number;
  creada_en: string | null;
}
