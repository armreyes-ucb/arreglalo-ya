import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cobertura geográfica:
 * - estado activo/inactivo de zonas (sin borrar historial);
 * - trazabilidad de ofertas fuera de cobertura;
 * - índice para consultar trabajadores por zona.
 *
 * Los valores por defecto conservan las ofertas y zonas existentes.
 */
export class CoberturaGeografica1795747200000
  implements MigrationInterface
{
  name = 'CoberturaGeografica1795747200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "zona"
        ADD COLUMN IF NOT EXISTS "activa" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      ALTER TABLE "oferta"
        ADD COLUMN IF NOT EXISTS "fuera_de_zona" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "distancia_zona" smallint NULL,
        ADD COLUMN IF NOT EXISTS "justificacion_fuera_zona" text NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "oferta"
        DROP CONSTRAINT IF EXISTS "chk_oferta_distancia_zona"
    `);
    await queryRunner.query(`
      ALTER TABLE "oferta"
        ADD CONSTRAINT "chk_oferta_distancia_zona"
        CHECK (
          "distancia_zona" IS NULL
          OR ("distancia_zona" >= 0 AND "distancia_zona" <= 2)
        )
    `);

    await queryRunner.query(`
      ALTER TABLE "oferta"
        DROP CONSTRAINT IF EXISTS "chk_oferta_fuera_zona"
    `);
    await queryRunner.query(`
      ALTER TABLE "oferta"
        ADD CONSTRAINT "chk_oferta_fuera_zona"
        CHECK (
          ("fuera_de_zona" = false AND "justificacion_fuera_zona" IS NULL)
          OR (
            "fuera_de_zona" = true
            AND "distancia_zona" IS NULL
            AND "justificacion_fuera_zona" IS NOT NULL
            AND char_length(btrim("justificacion_fuera_zona")) BETWEEN 15 AND 500
          )
        )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_trabajador_zona_zona"
        ON "trabajador_zona" ("zona_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_trabajador_zona_zona"
    `);
    await queryRunner.query(`
      ALTER TABLE "oferta"
        DROP CONSTRAINT IF EXISTS "chk_oferta_fuera_zona"
    `);
    await queryRunner.query(`
      ALTER TABLE "oferta"
        DROP CONSTRAINT IF EXISTS "chk_oferta_distancia_zona"
    `);
    await queryRunner.query(`
      ALTER TABLE "oferta"
        DROP COLUMN IF EXISTS "justificacion_fuera_zona",
        DROP COLUMN IF EXISTS "distancia_zona",
        DROP COLUMN IF EXISTS "fuera_de_zona"
    `);
    await queryRunner.query(`
      ALTER TABLE "zona"
        DROP COLUMN IF EXISTS "activa"
    `);
  }
}
