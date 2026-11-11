import { EstadoTrabajador } from '../enums/estado-trabajador.enum.js';
import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import { hoyISO } from './fechas.js';

export function motivoBloqueoOferta(
  perfil: PerfilTrabajador,
  tieneCuentaBancaria: boolean,
  hoy = hoyISO(),
): string | null {
  if (perfil.estado !== EstadoTrabajador.ACTIVO) {
    return 'El perfil de trabajador no está activo';
  }
  if (perfil.nivelVerificacion < 2) {
    return 'Debe completar la verificación de niveles 1 y 2';
  }
  if (!tieneCuentaBancaria) {
    return 'Debe registrar una cuenta bancaria';
  }
  if (!perfil.venceAntecedentes || perfil.venceAntecedentes <= hoy) {
    return 'El certificado de antecedentes está vencido o no está registrado';
  }
  return null;
}

export interface EvaluacionOferta {
  puedeOfertar: boolean;
  motivo: string | null;
}

export function evaluarTrabajadorParaOferta(
  perfil: PerfilTrabajador,
  tieneCuentaBancaria: boolean,
  hoy = hoyISO(),
): EvaluacionOferta {
  const motivo = motivoBloqueoOferta(
    perfil,
    tieneCuentaBancaria,
    hoy,
  );
  return {
    puedeOfertar: motivo === null,
    motivo,
  };
}

