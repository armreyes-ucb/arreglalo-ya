import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { EstadoClienteConflictivo } from '../common/enums/estado-cliente-conflictivo.enum.js';
import { Usuario } from './usuario.entity.js';

@Entity('cliente_conflictivo')
export class ClienteConflictivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cliente_id', type: 'uuid', unique: true })
  clienteId: string;

  @Column({
    name: 'reportes_acumulados',
    type: 'int',
  })
  reportesAcumulados: number;

  @Column({ name: 'motivo', type: 'text' })
  motivo: string;

  @Column({
    name: 'registrado_por',
    type: 'uuid',
    nullable: true,
  })
  registradoPorId: string | null;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoClienteConflictivo,
    enumName: 'estado_cliente_conflictivo',
    default: EstadoClienteConflictivo.POTENCIAL,
  })
  estado: EstadoClienteConflictivo;

  /** Reportes comprobados por el supervisor (manuales o heredados). */
  @Column({ name: 'reportes_comprobados', type: 'int', default: 0 })
  reportesComprobados: number;

  /** Reportes automáticos de pagos pendientes de revisión. */
  @Column({ name: 'reportes_pendientes', type: 'int', default: 0 })
  reportesPendientes: number;

  @Column({ name: 'reclamos_totales', type: 'int', default: 0 })
  reclamosTotales: number;

  @Column({ name: 'reclamos_rechazados', type: 'int', default: 0 })
  reclamosRechazados: number;

  @Column({ name: 'cancelaciones', type: 'int', default: 0 })
  cancelaciones: number;

  @Column({ name: 'periodo_dias', type: 'int', default: 90 })
  periodoDias: number;

  /**
   * Evidencia más reciente (reclamo o cancelación) considerada al momento
   * de la última resolución. Evita reabrir un caso desestimado sin
   * evidencias nuevas.
   */
  @Column({
    name: 'evidencia_corte',
    type: 'timestamp',
    nullable: true,
  })
  evidenciaCorte: Date | null;

  @CreateDateColumn({ name: 'fecha_registro', type: 'timestamp' })
  fechaRegistro: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamp' })
  actualizadoEn: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'cliente_id' })
  cliente?: Relation<Usuario>;
}
