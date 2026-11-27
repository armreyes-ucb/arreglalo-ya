import { DataSource } from 'typeorm';
import { CoberturaGeografica1795747200000 } from './migrations/1795747200000-CoberturaGeografica.js';

try {
  process.loadEnvFile();
} catch {
  // Si no existe .env, se usan las variables ya presentes en el entorno.
}

function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

/**
 * DataSource exclusivo para migraciones versionadas.
 * No se registra en AppModule ni habilita `synchronize`.
 */
export const dataSource = new DataSource({
  type: 'postgres',
  host: requerido('DB_HOST'),
  port: Number(requerido('DB_PORT')),
  username: requerido('DB_USERNAME'),
  password: requerido('DB_PASSWORD'),
  database: requerido('DB_DATABASE'),
  // Las migraciones son SQL puro; no se necesita metadata de entidades.
  entities: [],
  migrations: [CoberturaGeografica1795747200000],
  synchronize: false,
});
