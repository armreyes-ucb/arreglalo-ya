import { NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import type { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import type { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import type { Zona } from '../entities/zona.entity.js';
import type { BuscarTrabajadoresQueryDto } from './dto/buscar-trabajadores-query.dto.js';
import { TrabajadoresService } from './trabajadores.service.js';

function crearZona(
  id: number,
  nombre: string,
  otb: string,
  zonasVecinas: string[] = [],
): Zona {
  return {
    id,
    nombre,
    otb,
    municipio: 'Cercado',
    zonasVecinas,
  };
}

function crearPerfil(
  id: string,
  nombre: string,
  promedio: number,
  trabajosCompletados: number,
): PerfilTrabajador {
  return {
    id,
    usuarioId: `usuario-${id}`,
    especialidades: [EspecialidadTipo.PLOMERIA],
    horarios: null,
    preciosEstimados: {},
    nivelVerificacion: 3,
    promedio,
    trabajosCompletados,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.ACTIVO,
    fechaPausa: null,
    venceAntecedentes: '2027-01-01',
    usuario: {
      id: `usuario-${id}`,
      nombreCompleto: nombre,
      telefono: '+59170000001',
      passwordHash: 'hash',
      roles: [],
      estado: EstadoUsuario.ACTIVO,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      aceptoTerminos: true,
      fechaRegistro: new Date('2026-01-01T00:00:00.000Z'),
      cuentaBancaria: {
        id: `cuenta-${id}`,
        usuarioId: `usuario-${id}`,
        banco: 'BNB',
        numeroCuentaCifrado: 'cifrado',
        titular: nombre,
      },
    },
  } as unknown as PerfilTrabajador;
}

describe('TrabajadoresService - CP26 match', () => {
  let perfilRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let zonaRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let trabajadorZonaRepository: { find: ReturnType<typeof vi.fn> };
  let documentoRepository: { find: ReturnType<typeof vi.fn> };
  let service: TrabajadoresService;

  beforeEach(() => {
    perfilRepository = { find: vi.fn(), findOne: vi.fn() };
    zonaRepository = { find: vi.fn(), findOne: vi.fn() };
    trabajadorZonaRepository = { find: vi.fn() };
    documentoRepository = { find: vi.fn() };
    service = new TrabajadoresService(
      perfilRepository as unknown as Repository<PerfilTrabajador>,
      zonaRepository as unknown as Repository<Zona>,
      trabajadorZonaRepository as unknown as Repository<TrabajadorZona>,
      documentoRepository as unknown as Repository<
        import('../entities/documento.entity.js').Documento
      >,
      {} as DataSource,
    );
  });

  it('ordena por cercanía, promedio y trabajos completados', async () => {
    const centro = crearZona(3, 'Centro', 'OTB Centro', [
      'Norte',
      'Sur',
    ]);
    const centroOtro = crearZona(7, 'Centro', 'OTB Centro 2');
    const norte = crearZona(1, 'Norte', 'OTB Norte');
    const sur = crearZona(4, 'Sur', 'OTB Sur');

    const perfiles = [
      crearPerfil('a', 'Mismo barrio', 3, 10),
      crearPerfil('b', 'Misma zona', 4.9, 10),
      crearPerfil('c', 'Vecino', 5, 1),
      crearPerfil('d', 'Vecino con más trabajos', 4.9, 20),
      crearPerfil('e', 'Vecino con promedio menor', 4.9, 5),
    ];
    const relaciones: TrabajadorZona[] = [
      { trabajadorId: 'a', zonaId: 3 } as TrabajadorZona,
      { trabajadorId: 'b', zonaId: 7 } as TrabajadorZona,
      { trabajadorId: 'c', zonaId: 4 } as TrabajadorZona,
      { trabajadorId: 'd', zonaId: 1 } as TrabajadorZona,
      { trabajadorId: 'e', zonaId: 1 } as TrabajadorZona,
    ];

    zonaRepository.findOne.mockResolvedValue(centro);
    zonaRepository.find.mockResolvedValue([
      centro,
      centroOtro,
      norte,
      sur,
    ]);
    perfilRepository.find.mockResolvedValue(perfiles);
    trabajadorZonaRepository.find.mockResolvedValue(relaciones);
    documentoRepository.find.mockResolvedValue([]);

    const resultado = await service.buscarTrabajadores({
      zona_id: 3,
      especialidad: EspecialidadTipo.PLOMERIA,
    } as BuscarTrabajadoresQueryDto);

    expect(resultado.map((trabajador) => trabajador.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
    expect(resultado.map((trabajador) => trabajador.distancia)).toEqual([
      0, 1, 2, 2, 2,
    ]);
  });

  it('devuelve el perfil público sin teléfono ni documentos', async () => {
    const perfil = crearPerfil('a', 'Trabajador Público', 4.8, 12);
    perfilRepository.findOne.mockResolvedValue(perfil);
    zonaRepository.find.mockResolvedValue([
      crearZona(3, 'Centro', 'OTB Centro'),
    ]);
    trabajadorZonaRepository.find.mockResolvedValue([
      { trabajadorId: 'a', zonaId: 3 } as TrabajadorZona,
    ]);
    documentoRepository.find.mockResolvedValue([]);

    const resultado = await service.obtenerPerfilPublico('a');

    expect(resultado.nombre_completo).toBe('Trabajador Público');
    expect(resultado).not.toHaveProperty('telefono');
    expect(resultado).not.toHaveProperty('documentos');
    expect(resultado.zonas).toHaveLength(1);
  });

  it('oculta perfiles que no están habilitados para ofertar', async () => {
    const perfil = crearPerfil('b', 'Trabajador Pausado', 4, 2);
    perfil.estado = EstadoTrabajador.PAUSADO;
    perfilRepository.findOne.mockResolvedValue(perfil);

    await expect(
      service.obtenerPerfilPublico('b'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('permite vaciar todos los precios estimados', () => {
    const precios = (
      service as unknown as {
        validarPrecios: (
          valor: Record<string, number>,
        ) => Record<string, number>;
      }
    ).validarPrecios({});

    expect(precios).toEqual({});
  });
});
