-- ============================================================================
-- Alertas de solicitudes sin ofertas + ampliación del plazo de propuestas
-- PostgreSQL 15+
--
-- Ejecutar con:
--   psql -h localhost -U postgres -d arreglalo_ya_db -f database/alertas-sin-ofertas.sql
--
-- El script es idempotente: puede ejecutarse varias veces sin perder datos.
-- ============================================================================

BEGIN;

-- 1. Plazo de recepción de propuestas en solicitud (si no existiera).
ALTER TABLE solicitud
  ADD COLUMN IF NOT EXISTS vence_en timestamp;

UPDATE solicitud
SET vence_en = creada_en + interval '30 days'
WHERE vence_en IS NULL;

ALTER TABLE solicitud
  ALTER COLUMN vence_en SET NOT NULL;

-- Marca de la última ampliación del plazo de propuestas.
ALTER TABLE solicitud
  ADD COLUMN IF NOT EXISTS ultima_ampliacion_en timestamp;

-- 2. Tipo enumerado para el estado de la alerta.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'estado_alerta'
  ) THEN
    CREATE TYPE estado_alerta AS ENUM ('ACTIVA', 'RESUELTA');
  END IF;
END
$$;

-- 3. Configuración del periodo (una sola fila, id = 1).
CREATE TABLE IF NOT EXISTS configuracion_alerta_sin_ofertas (
  id integer PRIMARY KEY,
  minutos_sin_ofertas integer NOT NULL
    CHECK (minutos_sin_ofertas > 0),
  actualizada_en timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_por uuid NULL
    REFERENCES usuario(id) ON DELETE SET NULL
);

INSERT INTO configuracion_alerta_sin_ofertas (id, minutos_sin_ofertas)
VALUES (1, 1440)
ON CONFLICT (id) DO NOTHING;

-- 4. Alertas asociadas a cada solicitud.
CREATE TABLE IF NOT EXISTS alerta_solicitud_sin_ofertas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitud_id uuid NOT NULL
    REFERENCES solicitud(id) ON DELETE CASCADE,
  estado estado_alerta NOT NULL DEFAULT 'ACTIVA',
  minutos_configurados integer NOT NULL
    CHECK (minutos_configurados > 0),
  vence_en_original timestamp NOT NULL,
  creada_en timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resuelta_en timestamp NULL,
  resuelta_por uuid NULL
    REFERENCES usuario(id) ON DELETE SET NULL
);

-- Solo una alerta activa por solicitud.
CREATE UNIQUE INDEX IF NOT EXISTS ux_alerta_sin_ofertas_activa
  ON alerta_solicitud_sin_ofertas (solicitud_id)
  WHERE estado = 'ACTIVA';

CREATE INDEX IF NOT EXISTS ix_alerta_sin_ofertas_estado
  ON alerta_solicitud_sin_ofertas (estado, creada_en);

COMMIT;
