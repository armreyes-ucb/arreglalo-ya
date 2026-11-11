import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import type { Zona } from '../../entities/zona.entity.js';
import type { PerfilTrabajadorPropio } from '../../trabajadores/interfaces/perfil-trabajador-propio.interface.js';
import { calcularEstadoAntecedentes } from '../utils/fechas.js';
import { motivoBloqueoOferta } from '../utils/rn10.js';
import { toPublicZona } from './zona-publica.mapper.js';

export function toPerfilTrabajadorPropio(
  perfil: PerfilTrabajador,
  zonas: Zona[],
  fotosTrabajos: string[],
): PerfilTrabajadorPropio {
  const antecedentes = calcularEstadoAntecedentes(
    perfil.venceAntecedentes,
  );
  const motivoBloqueo = motivoBloqueoOferta(
    perfil,
    Boolean(perfil.usuario?.cuentaBancaria),
  );
  return {
    id: perfil.id,
    usuario_id: perfil.usuarioId,
    nombre_completo: perfil.usuario?.nombreCompleto ?? '',
    telefono: perfil.usuario?.telefono ?? '',
    especialidades: perfil.especialidades,
    horarios: perfil.horarios,
    precios_estimados: perfil.preciosEstimados,
    promedio: perfil.promedio,
    trabajos_completados: perfil.trabajosCompletados,
    estado: perfil.estado,
    nivel_verificacion: perfil.nivelVerificacion,
    acepto_contrato_digital: perfil.aceptoContratoDigital,
    zonas: zonas.map(toPublicZona),
    fotos_trabajos: fotosTrabajos,
    vence_antecedentes: perfil.venceAntecedentes,
    antecedentes_por_vencer: antecedentes.por_vencer,
    antecedentes_vencidos: antecedentes.vencido,
    puede_ofertar: motivoBloqueo === null,
    motivo_bloqueo: motivoBloqueo,
  };
}
