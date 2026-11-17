import { describe, expect, it } from 'vitest';
import { EspecialidadTipo } from '../enums/especialidad-tipo.enum.js';
import { EstadoTrabajador } from '../enums/estado-trabajador.enum.js';
import {
  toTrabajadorMatch,
} from './trabajador-match.mapper.js';
import { toTrabajadorPerfilPublico } from './trabajador-perfil-publico.mapper.js';
import type { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';

function crearPerfil(
  venceAntecedentes: string | null,
): PerfilTrabajador {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    usuarioId: '22222222-2222-4222-8222-222222222222',
    especialidades: [EspecialidadTipo.PLOMERIA],
    horarios: 'Lun-Sáb 08:00-18:00',
    preciosEstimados: { PLOMERIA: 100 },
    nivelVerificacion: 3,
    promedio: 4.8,
    trabajosCompletados: 20,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.ACTIVO,
    fechaPausa: null,
    venceAntecedentes,
    usuario: {
      nombreCompleto: 'Trabajador Verificado',
    },
  } as unknown as PerfilTrabajador;
}

describe('CP25: insignia y ofertas con antecedentes vencidos', () => {
  it('expone antecedentes_vencidos en el perfil público', () => {
    const perfil = crearPerfil('2020-01-01');
    const publico = toTrabajadorPerfilPublico(perfil, [], []);
    expect(publico.nivel_verificacion).toBe(3);
    expect(publico.antecedentes_vencidos).toBe(true);
  });

  it('expone antecedentes_vencidos en el listado de búsqueda', () => {
    const perfil = crearPerfil('2020-01-01');
    const match = toTrabajadorMatch(perfil, [], [], 0);
    expect(match.nivel_verificacion).toBe(3);
    expect(match.antecedentes_vencidos).toBe(true);
  });

  it('mantiene la insignia cuando el certificado sigue vigente', () => {
    const perfil = crearPerfil('2099-01-01');
    const publico = toTrabajadorPerfilPublico(perfil, [], []);
    expect(publico.antecedentes_vencidos).toBe(false);
  });
});
