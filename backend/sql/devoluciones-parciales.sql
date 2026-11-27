-- Devoluciones parciales de pagos.
--
-- Antes, `devolucion.pago_id` era único: cada pago podía tener una sola
-- devolución (el 100% del pago inicial del 25%). Ahora se permiten varias
-- devoluciones parciales por pago y la suma se valida en el backend contra
-- `pago.pago_inicial_25`.
--
-- Idempotente: se puede ejecutar más de una vez sin efectos secundarios.

ALTER TABLE devolucion
  DROP CONSTRAINT IF EXISTS devolucion_pago_id_key;

CREATE INDEX IF NOT EXISTS idx_devolucion_pago_id
  ON devolucion (pago_id);
