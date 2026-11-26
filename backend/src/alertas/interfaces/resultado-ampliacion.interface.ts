import type { SolicitudPublica } from '../../solicitudes/interfaces/solicitud-publica.interface.js';

/** Resultado de ampliar el plazo de recepción de propuestas de una solicitud. */
export interface ResultadoAmpliacionPlazo {
  solicitud: SolicitudPublica;
  alertas_resueltas: number;
  vence_en_anterior: Date;
  vence_en_nueva: Date;
}
