import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { PerfilTrabajador } from './perfil-trabajador.entity.js';
import { Usuario } from './usuario.entity.js';

@Entity('suspension')
export class Suspension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trabajador_id', type: 'uuid' })
  trabajadorId: string;

  @Column({ name: 'numero_falta', type: 'int' })
  numeroFalta: number;

  @Column({ name: 'dias_fibonacci', type: 'int' })
  diasFibonacci: number;

  @Column({ name: 'motivo', type: 'text' })
  motivo: string;

  @Column({
    name: 'aplicada_por',
    type: 'uuid',
    nullable: true,
  })
  aplicadaPorId: string | null;

  @CreateDateColumn({ name: 'inicio', type: 'timestamp' })
  inicio: Date;

  @Column({ name: 'fin', type: 'timestamp' })
  fin: Date;

  @ManyToOne(() => PerfilTrabajador)
  @JoinColumn({ name: 'trabajador_id' })
  trabajador?: Relation<PerfilTrabajador>;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'aplicada_por' })
  aplicadaPor?: Relation<Usuario> | null;
}
