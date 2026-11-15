import type { SuspensionPublica } from '../../common/interfaces/suspension-publica.interface.js';
import type { DevolucionPublica } from '../../pagos/interfaces/devolucion-publica.interface.js';
import type { PagoPublico } from '../../pagos/interfaces/pago-publico.interface.js';
import type { TransferenciaSimulada } from '../../pagos/interfaces/transferencia-simulada.interface.js';
import type { SolicitudPublica } from './solicitud-publica.interface.js';

export interface ResolucionCancelacion {
  solicitud: SolicitudPublica;
  pago: PagoPublico | null;
  devolucion: DevolucionPublica | null;
  suspension: SuspensionPublica | null;
  transferencia: TransferenciaSimulada | null;
}
