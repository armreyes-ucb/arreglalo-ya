import 'reflect-metadata';
import { dataSource } from './data-source.js';

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    const ejecutadas = await dataSource.runMigrations({
      transaction: 'all',
    });
    if (ejecutadas.length === 0) {
      console.log('No hay migraciones pendientes.');
    } else {
      for (const migracion of ejecutadas) {
        console.log(`Migración aplicada: ${migracion.name}`);
      }
    }
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error('No se pudieron aplicar las migraciones:', error);
  process.exitCode = 1;
});
