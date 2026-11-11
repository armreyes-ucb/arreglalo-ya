import type { EstadoTrabajador } from '../../common/enums/estado-trabajador.enum.js';
import type { DocumentoRevision } from './documento-revision.interface.js';

export interface ResultadoRevisionVerificacion {
  mensaje: string;
  perfil_id: string;
  estado: EstadoTrabajador;
  nivel_verificacion: number;
  decide: 'APROBAR' | 'RECHAZAR' | 'REQUIERE_DATOS';
  documentos: DocumentoRevision[];
}
