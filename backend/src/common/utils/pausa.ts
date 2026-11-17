import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import { EstadoTrabajador } from '../enums/estado-trabajador.enum.js';
import type { PausaTrabajador } from '../interfaces/pausa-trabajador.interface.js';
import { diferenciaDias, hoyISO, sumarDias } from './fechas.js';

/** RN09: la pausa voluntaria dura como máximo 30 días. */
export const DIAS_MAXIMOS_PAUSA = 30;

/** RF05: aviso al trabajador cuando falten 5 días para vencer la pausa. */
export const DIAS_RESTANTES_PARA_AVISO = 5;

/** RN09: a los 60 días desde la pausa (30 + otros 30) se da de baja el rol. */
export const DIAS_PARA_BAJA_AUTOMATICA = 60;

const SIN_PAUSA: PausaTrabajador = {
  pausado: false,
  estado: null,
  inicio: null,
  vence_en: null,
  dias_restantes: null,
  aviso: false,
  baja_en: null,
};

export interface OpcionesPausa {
  diasMaximosPausa?: number;
  diasBajaAutomatica?: number;
  diasAviso?: number;
}

/**
 * Deriva el estado de la pausa a partir de `fecha_pausa`, sin columnas
 * adicionales: vence a los 30 días y la baja del rol llega a los 60.
 * Los plazos se pueden ajustar desde la configuración (RF34).
 */
export function calcularPausa(
  perfil: PerfilTrabajador,
  hoy = hoyISO(),
  opciones: OpcionesPausa = {},
): PausaTrabajador {
  if (!perfil.fechaPausa) {
    return { ...SIN_PAUSA };
  }

  const diasMaximosPausa =
    opciones.diasMaximosPausa ?? DIAS_MAXIMOS_PAUSA;
  const diasBajaAutomatica =
    opciones.diasBajaAutomatica ?? DIAS_PARA_BAJA_AUTOMATICA;
  const diasAviso =
    opciones.diasAviso ?? DIAS_RESTANTES_PARA_AVISO;

  const inicio = hoyISO(perfil.fechaPausa);
  const venceEn = hoyISO(
    sumarDias(perfil.fechaPausa, diasMaximosPausa),
  );
  const bajaEn = hoyISO(
    sumarDias(perfil.fechaPausa, diasBajaAutomatica),
  );
  const diasRestantes = Math.max(
    0,
    diferenciaDias(venceEn, hoy),
  );

  if (perfil.estado === EstadoTrabajador.BAJA) {
    return {
      pausado: false,
      estado: 'BAJA',
      inicio,
      vence_en: venceEn,
      dias_restantes: diasRestantes,
      aviso: false,
      baja_en: bajaEn,
    };
  }

  if (perfil.estado !== EstadoTrabajador.PAUSADO) {
    return { ...SIN_PAUSA };
  }

  const vencida = diasRestantes === 0;
  return {
    pausado: true,
    estado: vencida ? 'VENCIDA' : 'ACTIVA',
    inicio,
    vence_en: venceEn,
    dias_restantes: diasRestantes,
    aviso:
      !vencida && diasRestantes <= diasAviso,
    baja_en: bajaEn,
  };
}
