import type { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';
import type { ZonaPublica } from '../../common/interfaces/zona-publica.interface.js';
import type { OfertaPublica } from './oferta-publica.interface.js';

export interface TrabajadorResumenOferta {
  id: string;
  nombre_completo: string;
  promedio: number;
  trabajos_completados: number;
  nivel_verificacion: number;
  especialidades: EspecialidadTipo[];
  zonas: ZonaPublica[];
}

export interface OfertaConTrabajador extends OfertaPublica {
  trabajador: TrabajadorResumenOferta;
}
