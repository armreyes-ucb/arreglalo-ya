import 'reflect-metadata';
import { dataSource } from './data-source.js';

async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.undoLastMigration({ transaction: 'all' });
    console.log('Última migración revertida.');
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error('No se pudo revertir la migración:', error);
  process.exitCode = 1;
});
