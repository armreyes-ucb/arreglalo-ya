import type { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';
import type { EstadoTrabajador } from '../../common/enums/estado-trabajador.enum.js';
import type { ZonaPublica } from '../../common/interfaces/zona-publica.interface.js';

export interface PerfilTrabajadorPropio {
  id: string;
  usuario_id: string;
  nombre_completo: string;
  telefono: string;
  especialidades: EspecialidadTipo[];
  horarios: string | null;
  precios_estimados: Record<string, number>;
  promedio: number;
  trabajos_completados: number;
  estado: EstadoTrabajador;
  nivel_verificacion: number;
  acepto_contrato_digital: boolean;
  zonas: ZonaPublica[];
  fotos_trabajos: string[];
  vence_antecedentes: string | null;
  antecedentes_por_vencer: boolean;
  antecedentes_vencidos: boolean;
  puede_ofertar: boolean;
  motivo_bloqueo: string | null;
}
