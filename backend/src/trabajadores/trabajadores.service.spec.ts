import { BadRequestException, NotFoundException } from '@nestjs/common';
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
import { CONFIGURACION_POR_DEFECTO } from '../configuracion/configuracion.constants.js';
import type { ConfiguracionService } from '../configuracion/configuracion.service.js';
import type { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import type { Suspension } from '../entities/suspension.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Zona } from '../entities/zona.entity.js';
import type { BuscarTrabajadoresQueryDto } from './dto/buscar-trabajadores-query.dto.js';
import { TrabajadoresService } from './trabajadores.service.js';

function crearZona(
  id: number,
  nombre: string,
  otb: string,
  zonasVecinas: string[] = [],
  activa = true,
): Zona {
  return {
    id,
    nombre,
    otb,
    municipio: 'Cercado',
    zonasVecinas,
    activa,
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
    save: ReturnType<typeof vi.fn>;
  };
  let zonaRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let trabajadorZonaRepository: { find: ReturnType<typeof vi.fn> };
  let documentoRepository: { find: ReturnType<typeof vi.fn> };
  let suspensionRepository: {
    findOne: ReturnType<typeof vi.fn>;
  };
  let service: TrabajadoresService;

  beforeEach(() => {
    perfilRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      save: vi.fn(async (_entidad, datos) => datos),
    };
    zonaRepository = { find: vi.fn(), findOne: vi.fn() };
    trabajadorZonaRepository = { find: vi.fn() };
    documentoRepository = { find: vi.fn() };
    suspensionRepository = { findOne: vi.fn() };
    service = new TrabajadoresService(
      perfilRepository as unknown as Repository<PerfilTrabajador>,
      zonaRepository as unknown as Repository<Zona>,
      trabajadorZonaRepository as unknown as Repository<TrabajadorZona>,
      documentoRepository as unknown as Repository<
        import('../entities/documento.entity.js').Documento
      >,
      suspensionRepository as unknown as Repository<Suspension>,
      {} as DataSource,
      { find: vi.fn(async () => []) } as never,
      { find: vi.fn(async () => []) } as never,
      { findOne: vi.fn(), update: vi.fn() } as never,
      {
        get: () => ({ ...CONFIGURACION_POR_DEFECTO }),
      } as unknown as ConfiguracionService,
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

  it('reactiva solo los perfiles suspendidos con la suspensión vencida', async () => {
    const vencida = crearPerfil('a', 'Suspendido vencido', 4, 2);
    vencida.estado = EstadoTrabajador.SUSPENDIDO;
    const vigente = crearPerfil('b', 'Suspendido vigente', 4, 2);
    vigente.estado = EstadoTrabajador.SUSPENDIDO;

    perfilRepository.find.mockResolvedValue([vencida, vigente]);
    suspensionRepository.findOne.mockImplementation(
      ({ where }: { where: { trabajadorId: string } }) =>
        Promise.resolve(
          where.trabajadorId === 'a'
            ? { fin: new Date(Date.now() - 60_000) }
            : { fin: new Date(Date.now() + 60 * 60_000) },
        ),
    );

    const reactivados =
      await service.reactivarSuspensionesVencidas();

    expect(reactivados).toBe(1);
    expect(vencida.estado).toBe(EstadoTrabajador.ACTIVO);
    expect(vigente.estado).toBe(EstadoTrabajador.SUSPENDIDO);
    expect(perfilRepository.save).toHaveBeenCalledTimes(1);
    expect(perfilRepository.find).toHaveBeenCalledWith({
      where: { estado: EstadoTrabajador.SUSPENDIDO },
    });
  });

  it('no reactiva un perfil suspendido sin suspensión registrada', async () => {
    const perfil = crearPerfil('a', 'Sin registro', 4, 2);
    perfil.estado = EstadoTrabajador.SUSPENDIDO;
    perfilRepository.find.mockResolvedValue([perfil]);
    suspensionRepository.findOne.mockResolvedValue(null);

    const reactivados =
      await service.reactivarSuspensionesVencidas();

    expect(reactivados).toBe(0);
    expect(perfil.estado).toBe(EstadoTrabajador.SUSPENDIDO);
  });

  it('rechaza búsquedas en una zona desactivada', async () => {
    zonaRepository.findOne.mockResolvedValue(
      crearZona(3, 'Centro', 'OTB Centro', [], false),
    );

    await expect(
      service.buscarTrabajadores({
        zona_id: 3,
        especialidad: EspecialidadTipo.PLOMERIA,
      } as BuscarTrabajadoresQueryDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(perfilRepository.find).not.toHaveBeenCalled();
  });

  it('excluye del match a trabajadores que solo tienen zonas desactivadas', async () => {
    const centro = crearZona(3, 'Centro', 'OTB Centro');
    const inactiva = crearZona(5, 'Sur', 'OTB Sur', [], false);
    zonaRepository.findOne.mockResolvedValue(centro);
    zonaRepository.find.mockResolvedValue([centro, inactiva]);
    perfilRepository.find.mockResolvedValue([
      crearPerfil('a', 'Solo zona inactiva', 5, 20),
    ]);
    trabajadorZonaRepository.find.mockResolvedValue([
      { trabajadorId: 'a', zonaId: 5 } as TrabajadorZona,
    ]);
    documentoRepository.find.mockResolvedValue([]);

    const resultado = await service.buscarTrabajadores({
      zona_id: 3,
      especialidad: EspecialidadTipo.PLOMERIA,
    } as BuscarTrabajadoresQueryDto);

    expect(resultado).toEqual([]);
  });

  describe('reemplazarZonas', () => {
    type Reemplazador = (
      manager: {
        find: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        save: ReturnType<typeof vi.fn>;
      },
      perfilId: string,
      zonaIds: number[],
    ) => Promise<void>;

    function managerFalso(
      zonas: Zona[],
      actuales: TrabajadorZona[],
    ) {
      return {
        find: vi.fn(async (entidad: unknown) =>
          entidad === Zona ? zonas : actuales,
        ),
        delete: vi.fn(async () => ({ affected: 1 })),
        create: vi.fn((_entidad: unknown, datos: object) => ({
          ...datos,
        })),
        save: vi.fn(async () => undefined),
      };
    }

    it('rechaza asignar una zona desactivada nueva', async () => {
      const inactiva = crearZona(5, 'Sur', 'OTB Sur', [], false);
      const manager = managerFalso([inactiva], []);
      const reemplazar = (
        service as unknown as { reemplazarZonas: Reemplazador }
      ).reemplazarZonas.bind(service);

      await expect(
        reemplazar(manager, 'a', [5]),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.delete).not.toHaveBeenCalled();
    });

    it('permite conservar una zona desactivada ya asignada', async () => {
      const inactiva = crearZona(5, 'Sur', 'OTB Sur', [], false);
      const manager = managerFalso(
        [inactiva],
        [{ trabajadorId: 'a', zonaId: 5 } as TrabajadorZona],
      );
      const reemplazar = (
        service as unknown as { reemplazarZonas: Reemplazador }
      ).reemplazarZonas.bind(service);

      await reemplazar(manager, 'a', [5]);

      expect(manager.delete).toHaveBeenCalledWith(TrabajadorZona, {
        trabajadorId: 'a',
      });
      expect(manager.save).toHaveBeenCalledWith(TrabajadorZona, [
        { trabajadorId: 'a', zonaId: 5 },
      ]);
    });
  });
});
