import type { EstadoDevolucion } from '../../common/enums/estado-devolucion.enum.js';

export interface DevolucionPublica {
  id: string;
  pago_id: string;
  motivo: string;
  monto: number;
  fecha_limite: string;
  estado: EstadoDevolucion;
}
