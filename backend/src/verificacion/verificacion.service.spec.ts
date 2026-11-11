import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { DecisionRevision } from '../common/enums/decision-revision.enum.js';
import { EstadoRevision } from '../common/enums/estado-revision.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { TipoDocumento } from '../common/enums/tipo-documento.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import type { CuentaBancaria } from '../entities/cuenta-bancaria.entity.js';
import type { Documento } from '../entities/documento.entity.js';
import type { PerfilTrabajador } from '../entities/perfil-trabajador.entity.js';
import type { DocumentStorageService } from './document-storage.service.js';
import type { RevisarVerificacionDto } from './dto/revisar-verificacion.dto.js';
import { VerificacionService } from './verificacion.service.js';

describe('VerificacionService - CP24', () => {
  let perfilRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let documentoRepository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let cuentaRepository: { findOne: ReturnType<typeof vi.fn> };
  let documentStorage: {
    guardar: ReturnType<typeof vi.fn>;
    leer: ReturnType<typeof vi.fn>;
  };
  let dataSource: { transaction: ReturnType<typeof vi.fn> };
  let service: VerificacionService;

  beforeEach(() => {
    perfilRepository = { find: vi.fn(), findOne: vi.fn() };
    documentoRepository = { find: vi.fn(), findOne: vi.fn() };
    cuentaRepository = { findOne: vi.fn() };
    documentStorage = { guardar: vi.fn(), leer: vi.fn() };
    dataSource = { transaction: vi.fn() };
    service = new VerificacionService(
      perfilRepository as unknown as Repository<PerfilTrabajador>,
      documentoRepository as unknown as Repository<Documento>,
      cuentaRepository as unknown as Repository<CuentaBancaria>,
      documentStorage as unknown as DocumentStorageService,
      dataSource as unknown as DataSource,
    );
  });

  it('exige motivo al rechazar una verificación', async () => {
    await expect(
      service.revisar(
        'trabajador',
        'supervisor',
        {
          decision: DecisionRevision.RECHAZAR,
          motivo_rechazo: '   ',
        } as RevisarVerificacionDto,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('exige motivo al solicitar nuevos datos', async () => {
    await expect(
      service.revisar(
        'trabajador',
        'supervisor',
        {
          decision: DecisionRevision.REQUIERE_DATOS,
        } as RevisarVerificacionDto,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('permite al supervisor descargar un documento del expediente', async () => {
    documentoRepository.findOne.mockResolvedValue({
      id: 'documento',
      trabajadorId: 'trabajador',
      tipo: 'REJAP',
      archivoPrivadoUrl: 'private://documentos/rejap.pdf',
    });
    documentStorage.leer.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      mime: 'application/pdf',
      nombre: 'rejap.pdf',
    });

    const resultado = await service.obtenerArchivoDocumento(
      {
        id: 'supervisor',
        telefono: '+59170000002',
        roles: [Rol.SUPERVISOR],
        rolActivo: Rol.SUPERVISOR,
      } as AuthenticatedUser,
      'trabajador',
      'documento',
    );

    expect(resultado.mime).toBe('application/pdf');
    expect(resultado.tipo).toBe('REJAP');
  });

  it('impide que un trabajador descargue documentos ajenos', async () => {
    documentoRepository.findOne.mockResolvedValue({
      id: 'documento',
      trabajadorId: 'otro-trabajador',
      tipo: 'REJAP',
      archivoPrivadoUrl: 'private://documentos/rejap.pdf',
    });
    perfilRepository.findOne.mockResolvedValue(null);

    await expect(
      service.obtenerArchivoDocumento(
        {
          id: 'trabajador',
          telefono: '+59170000001',
          roles: [Rol.TRABAJADOR],
          rolActivo: Rol.TRABAJADOR,
        } as AuthenticatedUser,
        'otro-trabajador',
        'documento',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('devuelve 404 cuando el documento no existe', async () => {
    documentoRepository.findOne.mockResolvedValue(null);

    await expect(
      service.obtenerArchivoDocumento(
        {
          id: 'supervisor',
          telefono: '+59170000002',
          roles: [Rol.SUPERVISOR],
          rolActivo: Rol.SUPERVISOR,
        } as AuthenticatedUser,
        'trabajador',
        'documento',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ordena la bandeja por antigüedad y marca +48 h', async () => {
    const ahora = Date.now();
    const hace60Horas = new Date(ahora - 60 * 60 * 60 * 1000);
    const hace2Horas = new Date(ahora - 2 * 60 * 60 * 1000);

    const documentoViejo = {
      id: 'documento-viejo',
      trabajadorId: 'trabajador-viejo',
      tipo: TipoDocumento.CARNET_ANVERSO,
      archivoPrivadoUrl: 'private://viejo.jpg',
      estadoRevision: EstadoRevision.PENDIENTE,
      motivoRechazo: null,
      revisadoPorId: null,
      venceEn: null,
      fechaCarga: hace60Horas,
    } as Documento;
    const documentoNuevo = {
      id: 'documento-nuevo',
      trabajadorId: 'trabajador-nuevo',
      tipo: TipoDocumento.CARNET_ANVERSO,
      archivoPrivadoUrl: 'private://nuevo.jpg',
      estadoRevision: EstadoRevision.PENDIENTE,
      motivoRechazo: null,
      revisadoPorId: null,
      venceEn: null,
      fechaCarga: hace2Horas,
    } as Documento;

    documentoRepository.find
      .mockResolvedValueOnce([documentoViejo, documentoNuevo])
      .mockResolvedValueOnce([documentoViejo, documentoNuevo]);
    perfilRepository.find.mockResolvedValue([
      {
        id: 'trabajador-nuevo',
        usuarioId: 'usuario-nuevo',
        nivelVerificacion: 1,
        estado: EstadoTrabajador.PENDIENTE,
        venceAntecedentes: null,
        usuario: {
          nombreCompleto: 'Trabajador Nuevo',
          telefono: '+59170000002',
          cuentaBancaria: null,
        },
      } as unknown as PerfilTrabajador,
      {
        id: 'trabajador-viejo',
        usuarioId: 'usuario-viejo',
        nivelVerificacion: 2,
        estado: EstadoTrabajador.PENDIENTE,
        venceAntecedentes: null,
        usuario: {
          nombreCompleto: 'Trabajador Viejo',
          telefono: '+59170000001',
          cuentaBancaria: null,
        },
      } as unknown as PerfilTrabajador,
    ]);

    const resultado = await service.obtenerBandeja();

    expect(resultado.map((item) => item.trabajador_id)).toEqual([
      'trabajador-viejo',
      'trabajador-nuevo',
    ]);
    expect(resultado[0].mas_de_48_horas).toBe(true);
    expect(resultado[1].mas_de_48_horas).toBe(false);
  });
});
