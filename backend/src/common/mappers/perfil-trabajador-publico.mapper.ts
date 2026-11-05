import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import type { PerfilTrabajadorPublico } from '../../usuarios/interfaces/perfil-trabajador-publico.interface.js';

export function toPublicPerfil(
  perfil: PerfilTrabajador,
): PerfilTrabajadorPublico {
  return {
    id: perfil.id,
    especialidades: perfil.especialidades,
    estado: perfil.estado,
    nivel_verificacion: perfil.nivelVerificacion,
    acepto_contrato_digital: perfil.aceptoContratoDigital,
    promedio: perfil.promedio,
    trabajos_completados: perfil.trabajosCompletados,
  };
}
