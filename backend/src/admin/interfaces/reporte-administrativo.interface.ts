import type { EstadoDevolucion } from '../../common/enums/estado-devolucion.enum.js';
import type { EstadoReclamo } from '../../common/enums/estado-reclamo.enum.js';
import type { EstadoSolicitud } from '../../common/enums/estado-solicitud.enum.js';

export interface ReporteSolicitudes {
  total: number;
  urgentes: number;
  con_trabajador: number;
  sin_trabajador: number;
  por_estado: Partial<Record<EstadoSolicitud, number>>;
}

export interface ReporteComisiones {
  /** RF34: comisión efectivamente cobrada (QR PAGADO). */
  comision_cobrada: number;
  /** RF34: comisión devengada (finalizadas o canceladas con penalidad). */
  comision_devengada: number;
  pagos_confirmados: number;
  monto_total_acordado: number;
  pago_inicial_total: number;
}

export interface ReporteDevoluciones {
  total: number;
  monto_total: number;
  pendientes: number;
  en_proceso: number;
  completadas: number;
  por_estado: Partial<Record<EstadoDevolucion, number>>;
}

export interface ReporteReclamos {
  total: number;
  abiertos: number;
  vencidos_sla: number;
  por_estado: Partial<Record<EstadoReclamo, number>>;
}

export interface ReporteAdministrativo {
  desde: string | null;
  hasta: string | null;
  solicitudes: ReporteSolicitudes;
  comisiones: ReporteComisiones;
  devoluciones: ReporteDevoluciones;
  reclamos: ReporteReclamos;
}
