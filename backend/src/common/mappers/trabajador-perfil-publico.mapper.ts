import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import type { Zona } from '../../entities/zona.entity.js';
import type { TrabajadorPerfilPublico } from '../../trabajadores/interfaces/trabajador-perfil-publico.interface.js';
import { toPublicZona } from './zona-publica.mapper.js';

export function toTrabajadorPerfilPublico(
  perfil: PerfilTrabajador,
  zonas: Zona[],
  fotosTrabajos: string[],
): TrabajadorPerfilPublico {
  return {
    id: perfil.id,
    nombre_completo: perfil.usuario?.nombreCompleto ?? '',
    especialidades: perfil.especialidades,
    horarios: perfil.horarios,
    precios_estimados: perfil.preciosEstimados,
    promedio: perfil.promedio,
    trabajos_completados: perfil.trabajosCompletados,
    nivel_verificacion: perfil.nivelVerificacion,
    zonas: zonas.map(toPublicZona),
    fotos_trabajos: fotosTrabajos,
  };
}
