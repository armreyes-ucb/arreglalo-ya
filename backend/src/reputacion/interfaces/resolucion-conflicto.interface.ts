import type { DecisionConflicto } from '../../common/enums/decision-conflicto.enum.js';

export interface ResolucionConflictoPublica {
  id: string;
  conflictivo_id: string;
  cliente_id: string;
  supervisor_id: string;
  decision: DecisionConflicto;
  justificacion: string;
  indicadores: Record<string, unknown>;
  fecha: Date;
}
