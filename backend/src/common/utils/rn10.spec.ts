import { describe, expect, it } from 'vitest';
import { EspecialidadTipo } from '../enums/especialidad-tipo.enum.js';
import { EstadoTrabajador } from '../enums/estado-trabajador.enum.js';
import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import {
  evaluarTrabajadorParaOferta,
  motivoBloqueoOferta,
} from './rn10.js';

const PERFIL_ID = '22222222-2222-4222-8222-222222222222';
const USUARIO_ID = '11111111-1111-4111-8111-111111111111';
const HOY = '2026-11-09';

function crearPerfil(
  overrides: Partial<PerfilTrabajador> = {},
): PerfilTrabajador {
  const base = {
    id: PERFIL_ID,
    usuarioId: USUARIO_ID,
    especialidades: [EspecialidadTipo.PLOMERIA],
    horarios: null,
    preciosEstimados: {},
    nivelVerificacion: 2,
    promedio: 4.5,
    trabajosCompletados: 10,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.ACTIVO,
    fechaPausa: null,
    venceAntecedentes: '2027-01-01',
  } satisfies PerfilTrabajador;
  return Object.assign(base, overrides);
}

describe('RN10 - requisitos para ofertar', () => {
  it('permite ofertar a un trabajador activo, verificado, con cuenta y antecedentes vigentes', () => {
    const perfil = crearPerfil();
    expect(motivoBloqueoOferta(perfil, true, HOY)).toBeNull();
    expect(evaluarTrabajadorParaOferta(perfil, true, HOY)).toEqual({
      puedeOfertar: true,
      motivo: null,
    });
  });

  it('bloquea a un trabajador que no está activo', () => {
    const perfil = crearPerfil({ estado: EstadoTrabajador.PENDIENTE });
    expect(motivoBloqueoOferta(perfil, true, HOY)).toContain(
      'no está activo',
    );
  });

  it('bloquea a un trabajador con nivel de verificación menor a 2', () => {
    const perfil = crearPerfil({ nivelVerificacion: 1 });
    expect(motivoBloqueoOferta(perfil, true, HOY)).toContain(
      'verificación',
    );
  });

  it('CP13/CP25: bloquea a un trabajador sin cuenta bancaria', () => {
    const perfil = crearPerfil();
    const evaluacion = evaluarTrabajadorParaOferta(perfil, false, HOY);
    expect(evaluacion.puedeOfertar).toBe(false);
    expect(evaluacion.motivo).toContain('cuenta bancaria');
  });

  it('CP25: bloquea antecedentes vencidos o ausentes', () => {
    expect(
      motivoBloqueoOferta(
        crearPerfil({ venceAntecedentes: null }),
        true,
        HOY,
      ),
    ).toContain('vencido');
    expect(
      motivoBloqueoOferta(
        crearPerfil({ venceAntecedentes: HOY }),
        true,
        HOY,
      ),
    ).toContain('vencido');
    expect(
      motivoBloqueoOferta(
        crearPerfil({ venceAntecedentes: '2026-11-10' }),
        true,
        HOY,
      ),
    ).toBeNull();
  });
});
