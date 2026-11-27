import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { DecisionConflicto } from '../common/enums/decision-conflicto.enum.js';
import { ClienteConflictivo } from './cliente-conflictivo.entity.js';
import { Usuario } from './usuario.entity.js';

/**
 * RF32: historial append-only de resoluciones del supervisor. Cada decisión
 * se conserva como un registro independiente con el snapshot de indicadores
 * utilizados, para mantener la trazabilidad.
 */
@Entity('cliente_conflictivo_resolucion')
export class ClienteConflictivoResolucion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conflictivo_id', type: 'uuid' })
  conflictivoId: string;

  @Column({ name: 'cliente_id', type: 'uuid' })
  clienteId: string;

  @Column({ name: 'supervisor_id', type: 'uuid' })
  supervisorId: string;

  @Column({
    name: 'decision',
    type: 'enum',
    enum: DecisionConflicto,
    enumName: 'decision_conflicto',
  })
  decision: DecisionConflicto;

  @Column({ name: 'justificacion', type: 'text' })
  justificacion: string;

  @Column({ name: 'indicadores', type: 'jsonb' })
  indicadores: Record<string, unknown>;

  @CreateDateColumn({ name: 'fecha', type: 'timestamp' })
  fecha: Date;

  @ManyToOne(() => ClienteConflictivo)
  @JoinColumn({ name: 'conflictivo_id' })
  conflicto?: Relation<ClienteConflictivo>;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'cliente_id' })
  cliente?: Relation<Usuario>;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'supervisor_id' })
  supervisor?: Relation<Usuario>;
}
