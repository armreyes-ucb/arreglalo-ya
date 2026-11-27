import type { EspecialidadTipo } from '../../common/enums/especialidad-tipo.enum.js';
import type { EstadoTrabajador } from '../../common/enums/estado-trabajador.enum.js';
import type { ZonaPublica } from '../../common/interfaces/zona-publica.interface.js';
import type { MotivoCobertura } from '../../common/utils/cobertura.js';

/** Zona con cantidades para el panel de administración. */
export interface ZonaAdminResumen extends ZonaPublica {
  trabajadores_asignados: number;
  solicitudes_abiertas: number;
}

export interface TrabajadorCobertura {
  id: string;
  nombre_completo: string;
  estado: EstadoTrabajador;
  nivel_verificacion: number;
  promedio: number;
  trabajos_completados: number;
  especialidades: EspecialidadTipo[];
  distancia: number;
  motivo: MotivoCobertura;
}

/** Detalle de cobertura de una zona. */
export interface CoberturaZona {
  zona: ZonaPublica;
  asignados: number;
  total_cubren: number;
  trabajadores: TrabajadorCobertura[];
}
