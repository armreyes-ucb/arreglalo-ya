import type { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';
import type { EstadoTrabajador } from '../../common/enums/estado-trabajador.enum.js';

export interface PerfilTrabajadorPublico {
  id: string;
  especialidades: EspecialidadTipo[];
  estado: EstadoTrabajador;
  nivel_verificacion: number;
  acepto_contrato_digital: boolean;
  promedio: number;
  trabajos_completados: number;
}
