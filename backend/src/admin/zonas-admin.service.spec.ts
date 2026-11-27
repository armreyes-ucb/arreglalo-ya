import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import { Solicitud } from '../entities/solicitud.entity.js';
import { TrabajadorZona } from '../entities/trabajador-zona.entity.js';
import { Zona } from '../entities/zona.entity.js';
import { ZonasAdminService } from './zonas-admin.service.js';

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
  promedio = 4,
  trabajosCompletados = 1,
): PerfilTrabajador {
  return {
    id,
    usuarioId: `usuario-${id}`,
    especialidades: [EspecialidadTipo.PLOMERIA],
    horarios: null,
    preciosEstimados: {},
    nivelVerificacion: 2,
    promedio,
    trabajosCompletados,
    aceptoContratoDigital: true,
    estado: EstadoTrabajador.ACTIVO,
    fechaPausa: null,
    venceAntecedentes: '2027-01-01',
    usuario: {
      id: `usuario-${id}`,
      nombreCompleto: nombre,
    },
  } as unknown as PerfilTrabajador;
}

describe('ZonasAdminService', () => {
  let zonaRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let trabajadorZonaRepository: {
    find: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  let solicitudRepository: {
    find: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  let perfilRepository: { find: ReturnType<typeof vi.fn> };
  let service: ZonasAdminService;

  beforeEach(() => {
    zonaRepository = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((_entidad, datos) => ({ ...datos })),
      save: vi.fn(async (_entidad, datos) => datos),
      remove: vi.fn(),
    };
    trabajadorZonaRepository = { find: vi.fn(), count: vi.fn() };
    solicitudRepository = { find: vi.fn(), count: vi.fn() };
    perfilRepository = { find: vi.fn() };
    service = new ZonasAdminService(
      zonaRepository as unknown as Repository<Zona>,
      trabajadorZonaRepository as unknown as Repository<TrabajadorZona>,
      solicitudRepository as unknown as Repository<Solicitud>,
      perfilRepository as unknown as Repository<PerfilTrabajador>,
    );
  });

  it('lista zonas con trabajadores asignados y solicitudes abiertas', async () => {
    const centro = crearZona(3, 'Centro', 'OTB Centro');
    const norte = crearZona(1, 'Norte', 'OTB Norte');
    zonaRepository.find.mockResolvedValue([norte, centro]);
    trabajadorZonaRepository.find.mockResolvedValue([
      { trabajadorId: 'a', zonaId: 3 },
      { trabajadorId: 'b', zonaId: 3 },
      { trabajadorId: 'c', zonaId: 1 },
    ] as TrabajadorZona[]);
    solicitudRepository.find.mockResolvedValue([
      { id: 's1', zonaId: 3, estado: EstadoSolicitud.PUBLICADA },
      { id: 's2', zonaId: 3, estado: EstadoSolicitud.CON_OFERTAS },
      { id: 's3', zonaId: 1, estado: EstadoSolicitud.PUBLICADA },
    ] as Solicitud[]);

    const resultado = await service.listar();

    expect(resultado).toHaveLength(2);
    const centroResumen = resultado.find((zona) => zona.id === 3);
    const norteResumen = resultado.find((zona) => zona.id === 1);
    expect(centroResumen?.trabajadores_asignados).toBe(2);
    expect(centroResumen?.solicitudes_abiertas).toBe(2);
    expect(norteResumen?.trabajadores_asignados).toBe(1);
    expect(norteResumen?.solicitudes_abiertas).toBe(1);
  });

  it('crea zonas siempre activas', async () => {
    const guardada = crearZona(9, 'Nueva', 'OTB Nueva');
    zonaRepository.save.mockResolvedValue(guardada);

    const resultado = await service.crear({
      nombre: '  Nueva  ',
      otb: ' OTB Nueva ',
      municipio: 'Cercado',
      zonas_vecinas: [],
    });

    expect(zonaRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Nueva',
        otb: 'OTB Nueva',
        activa: true,
      }),
    );
    expect(resultado.activa).toBe(true);
  });

  it('cambia el estado de una zona sin eliminarla', async () => {
    const centro = crearZona(3, 'Centro', 'OTB Centro');
    zonaRepository.findOne.mockResolvedValue(centro);
    trabajadorZonaRepository.count.mockResolvedValue(2);
    solicitudRepository.count.mockResolvedValue(1);

    const resultado = await service.cambiarEstado(3, false);

    expect(centro.activa).toBe(false);
    expect(zonaRepository.save).toHaveBeenCalledWith(centro);
    expect(zonaRepository.remove).not.toHaveBeenCalled();
    expect(resultado.activa).toBe(false);
    expect(resultado.trabajadores_asignados).toBe(2);
  });

  it('calcula la cobertura usando solo zonas activas de los trabajadores', async () => {
    const centro = crearZona(3, 'Centro', 'OTB Centro', ['Norte']);
    const norte = crearZona(1, 'Norte', 'OTB Norte');
    const inactiva = crearZona(5, 'Sur', 'OTB Sur', [], false);
    zonaRepository.findOne.mockResolvedValue(centro);
    zonaRepository.find.mockResolvedValue([centro, norte, inactiva]);
    trabajadorZonaRepository.find.mockResolvedValue([
      { trabajadorId: 'a', zonaId: 3 },
      { trabajadorId: 'b', zonaId: 1 },
      { trabajadorId: 'c', zonaId: 5 },
    ] as TrabajadorZona[]);
    perfilRepository.find.mockResolvedValue([
      crearPerfil('a', 'Trabajador A', 4.5, 10),
      crearPerfil('b', 'Trabajador B', 4.9, 20),
      crearPerfil('c', 'Trabajador C', 5, 30),
    ]);

    const resultado = await service.cobertura(3);

    expect(resultado.zona.id).toBe(3);
    expect(resultado.asignados).toBe(1);
    expect(resultado.total_cubren).toBe(2);
    expect(resultado.trabajadores.map((trabajador) => trabajador.id)).toEqual([
      'a',
      'b',
    ]);
    expect(resultado.trabajadores.map((trabajador) => trabajador.distancia)).toEqual([
      0,
      2,
    ]);
  });

  it('no elimina una zona con trabajadores asignados', async () => {
    const centro = crearZona(3, 'Centro', 'OTB Centro');
    zonaRepository.findOne.mockResolvedValue(centro);
    trabajadorZonaRepository.count.mockResolvedValue(1);

    await expect(service.eliminar(3)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(zonaRepository.remove).not.toHaveBeenCalled();
  });

  it('elimina una zona sin trabajadores asignados', async () => {
    const centro = crearZona(3, 'Centro', 'OTB Centro');
    zonaRepository.findOne.mockResolvedValue(centro);
    trabajadorZonaRepository.count.mockResolvedValue(0);

    await service.eliminar(3);

    expect(zonaRepository.remove).toHaveBeenCalledWith(centro);
  });

  it('devuelve 404 si la zona no existe', async () => {
    zonaRepository.findOne.mockResolvedValue(null);

    await expect(service.cambiarEstado(99, false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
