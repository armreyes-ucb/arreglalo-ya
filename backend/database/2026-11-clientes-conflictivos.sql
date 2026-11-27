-- ============================================================================
-- RF32: detección de clientes conflictivos, criterios configurables y
-- resoluciones del supervisor.
--
-- El proyecto usa TypeORM con `synchronize: false` y no tiene migraciones.
-- Este script es el mecanismo versionado para aplicar el esquema y está
-- pensado para ejecutarse manualmente contra la base LOCAL de desarrollo:
--
--   psql -h localhost -p 5432 -U postgres -d arreglalo_ya_db ^
--        -f backend/database/2026-11-clientes-conflictivos.sql
--
-- Es idempotente: se puede volver a ejecutar sin duplicar filas, sin
-- reinicializar la configuración y sin tocar las resoluciones existentes.
-- ============================================================================

BEGIN;

-- 1. Tipos ENUM -------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'estado_cliente_conflictivo'
  ) THEN
    CREATE TYPE estado_cliente_conflictivo AS ENUM (
      'POTENCIAL',
      'CONFIRMADO',
      'DESESTIMADO'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'decision_conflicto'
  ) THEN
    CREATE TYPE decision_conflicto AS ENUM ('CONFIRMAR', 'DESESTIMAR');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'origen_reclamo'
  ) THEN
    CREATE TYPE origen_reclamo AS ENUM ('CLIENTE', 'TRABAJADOR');
  END IF;
END
$$;

-- 2. cliente_conflictivo: columnas nuevas (se agregan sin NOT NULL para
--    poder distinguir y migrar una sola vez los registros heredados) --------
ALTER TABLE cliente_conflictivo
  ADD COLUMN IF NOT EXISTS estado estado_cliente_conflictivo,
  ADD COLUMN IF NOT EXISTS reportes_comprobados integer,
  ADD COLUMN IF NOT EXISTS reportes_pendientes integer,
  ADD COLUMN IF NOT EXISTS reclamos_totales integer,
  ADD COLUMN IF NOT EXISTS reclamos_rechazados integer,
  ADD COLUMN IF NOT EXISTS cancelaciones integer,
  ADD COLUMN IF NOT EXISTS periodo_dias integer,
  ADD COLUMN IF NOT EXISTS evidencia_corte timestamp,
  ADD COLUMN IF NOT EXISTS actualizado_en timestamp;

-- Herencia: sólo filas que todavía no fueron clasificadas. Los reportes
-- históricos se conservan como comprobados para mantener la advertencia que
-- ya tenían (>= 3) sin inventar resoluciones ni supervisores.
UPDATE cliente_conflictivo
SET estado = 'POTENCIAL',
    reportes_comprobados = COALESCE(reportes_acumulados, 0),
    reportes_pendientes = 0,
    reclamos_totales = 0,
    reclamos_rechazados = 0,
    cancelaciones = 0,
    periodo_dias = 90,
    actualizado_en = COALESCE(fecha_registro, CURRENT_TIMESTAMP)
WHERE estado IS NULL;

ALTER TABLE cliente_conflictivo
  ALTER COLUMN estado SET DEFAULT 'POTENCIAL',
  ALTER COLUMN estado SET NOT NULL,
  ALTER COLUMN reportes_comprobados SET DEFAULT 0,
  ALTER COLUMN reportes_comprobados SET NOT NULL,
  ALTER COLUMN reportes_pendientes SET DEFAULT 0,
  ALTER COLUMN reportes_pendientes SET NOT NULL,
  ALTER COLUMN reclamos_totales SET DEFAULT 0,
  ALTER COLUMN reclamos_totales SET NOT NULL,
  ALTER COLUMN reclamos_rechazados SET DEFAULT 0,
  ALTER COLUMN reclamos_rechazados SET NOT NULL,
  ALTER COLUMN cancelaciones SET DEFAULT 0,
  ALTER COLUMN cancelaciones SET NOT NULL,
  ALTER COLUMN periodo_dias SET DEFAULT 90,
  ALTER COLUMN periodo_dias SET NOT NULL,
  ALTER COLUMN actualizado_en SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN actualizado_en SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cliente_conflictivo_estado
  ON cliente_conflictivo (estado);

-- 3. reclamo.origen: distingue reclamos del cliente de los reportes del
--    trabajador generados desde el módulo de pagos. Las filas heredadas se
--    asumen iniciadas por el cliente (no hay información para diferenciarlas).
ALTER TABLE reclamo
  ADD COLUMN IF NOT EXISTS origen origen_reclamo;

UPDATE reclamo SET origen = 'CLIENTE' WHERE origen IS NULL;

ALTER TABLE reclamo
  ALTER COLUMN origen SET DEFAULT 'CLIENTE',
  ALTER COLUMN origen SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reclamo_origen_fecha
  ON reclamo (origen, fecha_apertura);

-- 4. Criterios configurables (fila única) -----------------------------------
CREATE TABLE IF NOT EXISTS configuracion_clientes_conflictivos (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  deteccion_activa boolean NOT NULL DEFAULT true,
  periodo_dias integer NOT NULL DEFAULT 90,
  min_reclamos_rechazados integer NOT NULL DEFAULT 2,
  min_cancelaciones integer NOT NULL DEFAULT 3,
  min_reportes integer NOT NULL DEFAULT 3,
  min_reclamos_totales integer NOT NULL DEFAULT 0,
  actualizado_en timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_por uuid REFERENCES usuario (id)
);

INSERT INTO configuracion_clientes_conflictivos (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 5. Historial de resoluciones (append-only) --------------------------------
CREATE TABLE IF NOT EXISTS cliente_conflictivo_resolucion (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conflictivo_id uuid NOT NULL REFERENCES cliente_conflictivo (id),
  cliente_id uuid NOT NULL REFERENCES usuario (id),
  supervisor_id uuid NOT NULL REFERENCES usuario (id),
  decision decision_conflicto NOT NULL,
  justificacion text NOT NULL
    CHECK (char_length(btrim(justificacion)) BETWEEN 10 AND 1000),
  indicadores jsonb NOT NULL,
  fecha timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cc_resolucion_cliente_fecha
  ON cliente_conflictivo_resolucion (cliente_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_cc_resolucion_conflictivo
  ON cliente_conflictivo_resolucion (conflictivo_id);

COMMIT;
