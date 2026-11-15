import type { PagoPublico } from '../../pagos/interfaces/pago-publico.interface.js';
import type { ReportePublico } from '../../pagos/interfaces/resolucion-pago-final.interface.js';

export interface PagoSolicitudPublico {
  pago: PagoPublico;
  reporte_abierto: ReportePublico | null;
}
