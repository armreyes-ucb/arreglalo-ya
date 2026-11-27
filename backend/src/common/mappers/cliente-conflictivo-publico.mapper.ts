import type { ClienteConflictivo } from '../../entities/cliente-conflictivo.entity.js';
import type { ClienteConflictivoPublico } from '../../reputacion/interfaces/cliente-conflictivo-publico.interface.js';
import { debeAdvertirCliente } from '../../reputacion/utils/advertencia-conflictivo.js';

export function toClienteConflictivoPublico(
  conflictivo: ClienteConflictivo,
  umbralReportes: number,
): ClienteConflictivoPublico {
  return {
    id: conflictivo.id,
    cliente_id: conflictivo.clienteId,
    reportes_acumulados: conflictivo.reportesAcumulados,
    motivo: conflictivo.motivo,
    fecha_registro: conflictivo.fechaRegistro,
    advertir: debeAdvertirCliente(
      {
        estado: conflictivo.estado,
        reportesComprobados: conflictivo.reportesComprobados,
      },
      umbralReportes,
    ),
    estado: conflictivo.estado,
    reportes_comprobados: conflictivo.reportesComprobados,
    reportes_pendientes: conflictivo.reportesPendientes,
    reclamos_totales: conflictivo.reclamosTotales,
    reclamos_rechazados: conflictivo.reclamosRechazados,
    cancelaciones: conflictivo.cancelaciones,
    periodo_dias: conflictivo.periodoDias,
    actualizado_en: conflictivo.actualizadoEn,
  };
}
