import type { Devolucion } from '../../entities/devolucion.entity.js';
import type { DevolucionPublica } from '../../pagos/interfaces/devolucion-publica.interface.js';

export function toDevolucionPublica(
  devolucion: Devolucion,
): DevolucionPublica {
  return {
    id: devolucion.id,
    pago_id: devolucion.pagoId,
    motivo: devolucion.motivo,
    monto: devolucion.monto,
    fecha_limite: devolucion.fechaLimite,
    estado: devolucion.estado,
  };
}
