import type { EstadoTrabajador } from '../../common/enums/estado-trabajador.enum.js';
import type { DocumentoRevision } from './documento-revision.interface.js';

export interface ExpedienteVerificacion {
  trabajador_id: string;
  usuario_id: string;
  nombre_completo: string;
  telefono: string;
  nivel_verificacion: number;
  estado: EstadoTrabajador;
  vence_antecedentes: string | null;
  mas_de_48_horas: boolean;
  horas_en_espera: number;
  cuenta_bancaria: {
    banco: string;
    titular: string;
  } | null;
  documentos: DocumentoRevision[];
}
