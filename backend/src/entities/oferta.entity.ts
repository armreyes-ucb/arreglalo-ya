import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { EstadoOferta } from '../common/enums/estado-oferta.enum.js';
import { PerfilTrabajador } from './perfil-trabajador.entity.js';
import { Solicitud } from './solicitud.entity.js';

const numericToNumber = {
  to: (value: number): number => value,
  from: (value: string): number => Number(value),
};

@Entity('oferta')
export class Oferta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid' })
  solicitudId: string;

  @Column({ name: 'trabajador_id', type: 'uuid' })
  trabajadorId: string;

  @Column({
    name: 'precio_estimado',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  precioEstimado: number;

  @Column({
    name: 'costo_transporte',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericToNumber,
  })
  costoTransporte: number;

  @Column({
    name: 'fecha_propuesta',
    type: 'timestamp',
  })
  fechaPropuesta: Date;

  @Column({ name: 'mensaje', type: 'text', nullable: true })
  mensaje: string | null;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoOferta,
  })
  estado: EstadoOferta;

  @CreateDateColumn({ name: 'creada_en', type: 'timestamp' })
  creadaEn: Date;

  @ManyToOne(() => Solicitud, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud?: Relation<Solicitud>;

  @ManyToOne(() => PerfilTrabajador)
  @JoinColumn({ name: 'trabajador_id' })
  trabajador?: Relation<PerfilTrabajador>;
}
