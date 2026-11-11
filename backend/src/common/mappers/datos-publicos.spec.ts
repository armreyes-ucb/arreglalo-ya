import { describe, expect, it } from 'vitest';
import { EspecialidadTipo } from '../enums/especialidad-tipo.enum.js';
import { EstadoSolicitud } from '../enums/estado-solicitud.enum.js';
import { EstadoTrabajador } from '../enums/estado-trabajador.enum.js';
import type { PerfilTrabajador } from '../../entities/perfil-trabajador.entity.js';
import type { Solicitud } from '../../entities/solicitud.entity.js';
import type { Zona } from '../../entities/zona.entity.js';
import { toPerfilTrabajadorPropio } from './perfil-trabajador-propio.mapper.js';
import { toSolicitudDisponible } from './solicitud-disponible.mapper.js';
import { toTrabajadorMatch } from './trabajador-match.mapper.js';

const NUMERO_CUENTA = '1234567890123456';
const DIRECCION = 'Calle Secreta 123, zona oculta';

function crearZona(): Zona {
  return {
    id: 3,
    nombre: 'Centro',
    otb: 'OTB Centro',
    municipio: 'Cercado',
    zonasVecinas: ['Norte'],
  };
}

function crearPerfil(): PerfilTrabajador {
  const perfil = {
    id: '22222222-2222-4222-8222-222222222222',
    usuarioId: '11111111-1111-4111-8111-111111111111',
    especialidades: [EspecialidadTipo.PLOMERIA],
    horarios: 'Lunes a viernes',
    preciosEstimados: { PLOMERIA: 50 },
    nivelVerificacion: 2,
    promedio: 4.8,
    trabajosCompletados: 15,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.ACTIVO,
    fechaPausa: null,
    venceAntecedentes: '2027-01-01',
    usuario: {
      id: '11111111-1111-4111-8111-111111111111',
      nombreCompleto: 'Trabajador Prueba',
      telefono: '+59170000001',
      passwordHash: 'secreto',
      roles: [],
      estado: 'ACTIVO',
      intentosFallidos: 0,
      bloqueadoHasta: null,
      aceptoTerminos: true,
      fechaRegistro: new Date('2026-01-01T00:00:00.000Z'),
      cuentaBancaria: {
        id: '33333333-3333-4333-8333-333333333333',
        usuarioId: '11111111-1111-4111-8111-111111111111',
        banco: 'BNB',
        numeroCuentaCifrado: NUMERO_CUENTA,
        titular: 'Trabajador Prueba',
      },
    },
  };
  return perfil as unknown as PerfilTrabajador;
}

function crearSolicitud(): Solicitud {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    clienteId: '55555555-5555-4555-8555-555555555555',
    trabajadorConfirmadoId: null,
    zonaId: 3,
    especialidad: EspecialidadTipo.PLOMERIA,
    tipoProblema: 'Fuga de agua',
    descripcion: 'Fuga debajo del lavamanos de la cocina',
    fotosUrls: ['https://fotos/1.jpg'],
    direccionOculta: DIRECCION,
    fechaCitaPreferida: new Date('2026-11-10T10:00:00.000Z'),
    urgente: false,
    estado: EstadoSolicitud.PUBLICADA,
    creadaEn: new Date('2026-11-09T10:00:00.000Z'),
    venceEn: new Date('2026-12-09T10:00:00.000Z'),
    entroAlTope: null,
    cerradaEn: null,
  } as Solicitud;
}

describe('CP14/CP17 - datos públicos y privados', () => {
  it('CP14: la solicitud disponible no expone la dirección oculta', () => {
    const resultado = toSolicitudDisponible(
      crearSolicitud(),
      crearZona(),
      true,
    );
    expect(resultado).not.toHaveProperty('direccion_oculta');
    expect(JSON.stringify(resultado)).not.toContain(DIRECCION);
    expect(resultado.cliente_en_conflictivos).toBe(true);
  });

  it('CP17: el perfil público de match no expone datos privados', () => {
    const resultado = toTrabajadorMatch(
      crearPerfil(),
      [crearZona()],
      ['https://fotos/trabajo.jpg'],
      0,
    );
    expect(resultado).not.toHaveProperty('telefono');
    expect(resultado).not.toHaveProperty('passwordHash');
    expect(resultado).not.toHaveProperty('cuenta_bancaria');
    expect(resultado).not.toHaveProperty('vence_antecedentes');
    expect(resultado).not.toHaveProperty('documentos');
    expect(JSON.stringify(resultado)).not.toContain(NUMERO_CUENTA);
    expect(JSON.stringify(resultado)).not.toContain('secreto');
  });

  it('CP17: el perfil propio no expone documentos privados ni cuenta bancaria', () => {
    const resultado = toPerfilTrabajadorPropio(
      crearPerfil(),
      [crearZona()],
      [],
    );
    expect(resultado).not.toHaveProperty('documentos');
    expect(resultado).not.toHaveProperty('cuenta_bancaria');
    expect(JSON.stringify(resultado)).not.toContain(NUMERO_CUENTA);
  });
});
