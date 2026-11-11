import type { EstadoTrabajador } from '../../common/enums/estado-trabajador.enum.js';
import type { DocumentoRevision } from './documento-revision.interface.js';

export interface EstadoVerificacionTrabajador {
  perfil_id: string;
  estado: EstadoTrabajador;
  nivel_verificacion: number;
  vence_antecedentes: string | null;
  antecedentes_registrados: boolean;
  antecedentes_por_vencer: boolean;
  antecedentes_vencidos: boolean;
  puede_ofertar: boolean;
  motivo_bloqueo: string | null;
  cuenta_bancaria: {
    registrada: boolean;
    banco: string | null;
    titular: string | null;
  } | null;
  documentos: DocumentoRevision[];
}
