import type { EstadoTrabajador } from '../../common/enums/estado-trabajador.enum.js';
import type { DocumentoRevision } from './documento-revision.interface.js';

export interface RespuestaCargaDocumentos {
  mensaje: string;
  perfil_id: string;
  estado: EstadoTrabajador;
  vence_antecedentes: string | null;
  cuenta_bancaria: {
    banco: string;
    titular: string;
  };
  documentos: DocumentoRevision[];
}
