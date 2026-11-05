import type { Zona } from '../../entities/zona.entity.js';
import type { ZonaPublica } from '../interfaces/zona-publica.interface.js';

export function toPublicZona(zona: Zona): ZonaPublica {
  return {
    id: zona.id,
    nombre: zona.nombre,
    otb: zona.otb,
    municipio: zona.municipio,
    zonas_vecinas: zona.zonasVecinas,
  };
}
