import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { EstadoReclamo } from '../common/enums/estado-reclamo.enum.js';
import { Solicitud } from './solicitud.entity.js';

@Entity('reclamo')
export class Reclamo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid' })
  solicitudId: string;

  @Column({ name: 'motivo', type: 'text' })
  motivo: string;

  @Column({ name: 'evidencia_fotos', type: 'text', array: true })
  evidenciaFotos: string[];

  @Column({
    name: 'respuesta_trabajador',
    type: 'text',
    nullable: true,
  })
  respuestaTrabajador: string | null;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoReclamo,
    default: EstadoReclamo.ABIERTO,
  })
  estado: EstadoReclamo;

  @Column({
    name: 'resolucion_supervisor',
    type: 'text',
    nullable: true,
  })
  resolucionSupervisor: string | null;

  @CreateDateColumn({ name: 'fecha_apertura', type: 'timestamp' })
  fechaApertura: Date;

  @ManyToOne(() => Solicitud)
  @JoinColumn({ name: 'solicitud_id' })
  solicitud?: Relation<Solicitud>;
}
