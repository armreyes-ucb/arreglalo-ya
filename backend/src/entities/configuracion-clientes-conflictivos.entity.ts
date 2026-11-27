import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * RF32/RF34: criterios de detección de clientes conflictivos. Se guardan en
 * PostgreSQL (una única fila, `id = 1`) y no en el JSON de configuración
 * general. Los umbrales en 0 desactivan el criterio correspondiente.
 */
@Entity('configuracion_clientes_conflictivos')
export class ConfiguracionClientesConflictivos {
  @PrimaryColumn({ type: 'smallint', default: 1 })
  id: number;

  @Column({ name: 'deteccion_activa', type: 'boolean', default: true })
  deteccionActiva: boolean;

  @Column({ name: 'periodo_dias', type: 'int', default: 90 })
  periodoDias: number;

  @Column({
    name: 'min_reclamos_rechazados',
    type: 'int',
    default: 2,
  })
  minReclamosRechazados: number;

  @Column({ name: 'min_cancelaciones', type: 'int', default: 3 })
  minCancelaciones: number;

  @Column({ name: 'min_reportes', type: 'int', default: 3 })
  minReportes: number;

  @Column({ name: 'min_reclamos_totales', type: 'int', default: 0 })
  minReclamosTotales: number;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp' })
  actualizadoEn: Date;

  @Column({
    name: 'actualizado_por',
    type: 'uuid',
    nullable: true,
  })
  actualizadoPorId: string | null;
}
