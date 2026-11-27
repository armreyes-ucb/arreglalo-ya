import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { EstadoDevolucion } from '../common/enums/estado-devolucion.enum.js';
import { Pago } from './pago.entity.js';

const numericToNumber = {
  to: (value: number): number => value,
  from: (value: string): number => Number(value),
};

@Entity('devolucion')
export class Devolucion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Varias devoluciones (parciales) pueden pertenecer al mismo pago, por eso
   * la columna ya no es única. La suma de los montos nunca debe superar el
   * pago inicial del 25%; esa validación vive en la capa de servicio.
   */
  @Column({ name: 'pago_id', type: 'uuid' })
  pagoId: string;

  @Column({ name: 'motivo', type: 'text' })
  motivo: string;

  @Column({
    name: 'monto',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToNumber,
  })
  monto: number;

  @Column({ name: 'fecha_limite', type: 'date' })
  fechaLimite: string;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 30,
    default: EstadoDevolucion.PENDIENTE,
  })
  estado: EstadoDevolucion;

  @ManyToOne(() => Pago)
  @JoinColumn({ name: 'pago_id' })
  pago?: Relation<Pago>;
}
