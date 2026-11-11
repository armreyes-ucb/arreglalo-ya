import type { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';
import type { ZonaPublica } from '../../common/interfaces/zona-publica.interface.js';

export interface TrabajadorMatch {
  id: string;
  nombre_completo: string;
  especialidades: EspecialidadTipo[];
  horarios: string | null;
  precios_estimados: Record<string, number>;
  promedio: number;
  trabajos_completados: number;
  nivel_verificacion: number;
  zonas: ZonaPublica[];
  fotos_trabajos: string[];
  distancia: number;
}
