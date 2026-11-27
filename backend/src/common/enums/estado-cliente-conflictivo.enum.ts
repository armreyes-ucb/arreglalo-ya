/** RF32: estado del caso de un cliente conflictivo. */
export enum EstadoClienteConflictivo {
  /** Detectado automáticamente, pendiente de revisión del supervisor. */
  POTENCIAL = 'POTENCIAL',
  /** Confirmado como conflictivo mediante una resolución. */
  CONFIRMADO = 'CONFIRMADO',
  /** Revisado y descartado por el supervisor. */
  DESESTIMADO = 'DESESTIMADO',
}
