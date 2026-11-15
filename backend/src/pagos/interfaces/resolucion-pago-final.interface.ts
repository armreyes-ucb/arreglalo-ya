import type { EstadoReclamo } from '../../common/enums/estado-reclamo.enum.js';
import type { EstadoSolicitud } from '../../common/enums/estado-solicitud.enum.js';
import type { PagoPublico } from './pago-publico.interface.js';
import type { TransferenciaSimulada } from './transferencia-simulada.interface.js';

export interface ReportePublico {
  id: string;
  estado: EstadoReclamo;
}

export interface ResolucionPagoFinal {
  pago: PagoPublico;
  estado_solicitud: EstadoSolicitud;
  transferencia: TransferenciaSimulada | null;
  reporte: ReportePublico | null;
}
