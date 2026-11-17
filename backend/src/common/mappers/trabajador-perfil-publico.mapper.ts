import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import type { Zona } from '../../entities/zona.entity.js';
import type { TrabajadorPerfilPublico } from '../../trabajadores/interfaces/trabajador-perfil-publico.interface.js';
import { calcularEstadoAntecedentes } from '../utils/fechas.js';
import { toPublicZona } from './zona-publica.mapper.js';

export function toTrabajadorPerfilPublico(
  perfil: PerfilTrabajador,
  zonas: Zona[],
  fotosTrabajos: string[],
): TrabajadorPerfilPublico {
  const antecedentes = calcularEstadoAntecedentes(
    perfil.venceAntecedentes,
  );
  return {
    id: perfil.id,
    nombre_completo: perfil.usuario?.nombreCompleto ?? '',
    especialidades: perfil.especialidades,
    horarios: perfil.horarios,
    precios_estimados: perfil.preciosEstimados,
    promedio: perfil.promedio,
    trabajos_completados: perfil.trabajosCompletados,
    nivel_verificacion: perfil.nivelVerificacion,
    antecedentes_vencidos: antecedentes.vencido,
    zonas: zonas.map(toPublicZona),
    fotos_trabajos: fotosTrabajos,
  };
}
