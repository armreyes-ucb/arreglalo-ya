import type { EstadoSolicitud } from '../../common/enums/estado-solicitud.enum.js';
import type { TipoPrecio } from '../../common/enums/tipo-precio.enum.js';
import type { PagoPublico } from '../../pagos/interfaces/pago-publico.interface.js';
import type { DevolucionPublica } from '../../pagos/interfaces/devolucion-publica.interface.js';

export interface PrecioPublico {
  id: string;
  solicitud_id: string;
  tipo: TipoPrecio;
  monto: number;
  motivo: string | null;
  foto_evidencia_url: string | null;
  aprobado_cliente: boolean | null;
  fecha: Date;
}

export interface ResolucionPrecio {
  precio: PrecioPublico;
  pago: PagoPublico | null;
  devolucion: DevolucionPublica | null;
  estado_solicitud: EstadoSolicitud;
}
