import type { EstadoRevision } from '../../common/enums/estado-revision.enum.js';
import type { TipoDocumento } from '../../common/enums/tipo-documento.enum.js';

export interface DocumentoRevision {
  id: string;
  tipo: TipoDocumento | string;
  estado: EstadoRevision;
  archivo_privado_url?: string;
  motivo_rechazo: string | null;
  vence_en: string | null;
  fecha_carga: Date;
  revisado_por: string | null;
}
