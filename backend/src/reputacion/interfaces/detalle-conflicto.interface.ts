import type { EstadoClienteConflictivo } from '../../common/enums/estado-cliente-conflictivo.enum.js';
import type { EstadoReclamo } from '../../common/enums/estado-reclamo.enum.js';
import type { ResolucionConflictoPublica } from './resolucion-conflicto.interface.js';

export interface IndicadoresConflictoPublicos {
  reclamos_totales: number;
  reclamos_rechazados: number;
  cancelaciones: number;
  reportes_comprobados: number;
  reportes_pendientes: number;
  periodo_dias: number;
}

export interface ReclamoEvidencia {
  id: string;
  solicitud_id: string;
  fecha: Date;
  estado: EstadoReclamo;
  motivo: string;
}

export interface CancelacionEvidencia {
  solicitud_id: string;
  fecha: Date;
}

export interface DetalleConflictoPublico {
  cliente_id: string;
  estado: EstadoClienteConflictivo;
  indicadores: IndicadoresConflictoPublicos;
  motivos: string[];
  reclamos: ReclamoEvidencia[];
  cancelaciones: CancelacionEvidencia[];
  resoluciones: ResolucionConflictoPublica[];
}
