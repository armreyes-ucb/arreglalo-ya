import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
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

  @CreateDateColumn({ name: 'fecha_registro', type: 'timestamp' })
  fechaRegistro: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'cliente_id' })
  cliente?: Relation<Usuario>;
}
