import type { Oferta } from '../../entities/oferta.entity.js';
import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import type { Zona } from '../../entities/zona.entity.js';
import type { OfertaConTrabajador } from '../../solicitudes/interfaces/oferta-con-trabajador.interface.js';
import { toOfertaPublica } from './oferta-publica.mapper.js';
import { toPublicZona } from './zona-publica.mapper.js';

export function toOfertaConTrabajador(
  oferta: Oferta,
  perfil: PerfilTrabajador | undefined,
  zonas: Zona[],
): OfertaConTrabajador {
  return {
    ...toOfertaPublica(oferta),
    trabajador: {
      id: perfil?.id ?? oferta.trabajadorId,
      nombre_completo: perfil?.usuario?.nombreCompleto ?? '',
      promedio: perfil?.promedio ?? 0,
      trabajos_completados: perfil?.trabajosCompletados ?? 0,
      nivel_verificacion: perfil?.nivelVerificacion ?? 0,
      especialidades: perfil?.especialidades ?? [],
      zonas: zonas.map(toPublicZona),
    },
  };
}
