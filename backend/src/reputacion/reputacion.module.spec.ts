import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it } from 'vitest';
import { ConfiguracionModule } from '../configuracion/configuracion.module.js';
import { ConfiguracionClientesConflictivos } from '../entities/configuracion-clientes-conflictivos.entity.js';
import { ClienteConflictivoResolucion } from '../entities/cliente-conflictivo-resolucion.entity.js';
import { ReputacionModule } from './reputacion.module.js';

/**
 * `autoLoadEntities: true` solo registra las entidades declaradas con
 * `TypeOrmModule.forFeature()`. Si una entidad usada mediante
 * `dataSource.getRepository()` o `manager.create()` no está registrada, la
 * aplicación compila y las pruebas con repositorios simulados pasan, pero
 * en ejecución real TypeORM lanza `EntityMetadataNotFoundError`.
 */
function repositoriosRegistrados(modulo: object): unknown[] {
  const imports = (Reflect.getMetadata('imports', modulo) ?? []) as Array<{
    providers?: Array<{ provide?: unknown }>;
  }>;
  return imports
    .flatMap((item) => item.providers ?? [])
    .map((provider) => provider.provide)
    .filter((token) => token !== undefined);
}

describe('registro de entidades de clientes conflictivos', () => {
  it('registra ClienteConflictivoResolucion en TypeORM para el historial de resoluciones', () => {
    const tokens = repositoriosRegistrados(ReputacionModule);

    expect(tokens).toContain(getRepositoryToken(ClienteConflictivoResolucion));
  });

  it('registra los criterios configurables en TypeORM', () => {
    const tokens = repositoriosRegistrados(ConfiguracionModule);

    expect(tokens).toContain(
      getRepositoryToken(ConfiguracionClientesConflictivos),
    );
  });
});
