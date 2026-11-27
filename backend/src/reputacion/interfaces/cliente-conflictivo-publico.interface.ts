import type { EstadoClienteConflictivo } from '../../common/enums/estado-cliente-conflictivo.enum.js';

export interface ClienteConflictivoPublico {
  id: string;
  cliente_id: string;
  reportes_acumulados: number;
  motivo: string;
  fecha_registro: Date;
  advertir: boolean;
  estado: EstadoClienteConflictivo;
  reportes_comprobados: number;
  reportes_pendientes: number;
  reclamos_totales: number;
  reclamos_rechazados: number;
  cancelaciones: number;
  periodo_dias: number;
  actualizado_en: Date;
}
