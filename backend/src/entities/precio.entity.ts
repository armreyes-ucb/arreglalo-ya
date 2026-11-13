import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { TipoPrecio } from '../common/enums/tipo-precio.enum.js';
import { Solicitud } from './solicitud.entity.js';

const numericToNumber = {
  to: (value: number): number => value,
  from: (value: string): number => Number(value),
};

@Entity('precio')
export class Precio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid' })
  solicitudId: string;

  @Column({ name: 'tipo', type: 'enum', enum: TipoPrecio })
  tipo: TipoPrecio;

  @Column({
    name: 'monto',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToNumber,
  })
  monto: number;

  @Column({ name: 'motivo', type: 'text', nullable: true })
  motivo: string | null;

  @Column({
    name: 'foto_evidencia_url',
    type: 'text',
    nullable: true,
  })
  fotoEvidenciaUrl: string | null;

  @Column({
    name: 'aprobado_cliente',
    type: 'boolean',
    nullable: true,
  })
  aprobadoCliente: boolean | null;

  @CreateDateColumn({ name: 'fecha', type: 'timestamp' })
  fecha: Date;

  @ManyToOne(() => Solicitud, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud?: Relation<Solicitud>;
}
