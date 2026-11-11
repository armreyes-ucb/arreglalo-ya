import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { Solicitud } from './solicitud.entity.js';
import { Usuario } from './usuario.entity.js';

@Entity('historial_estado')
export class HistorialEstado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid' })
  solicitudId: string;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoSolicitud,
  })
  estado: EstadoSolicitud;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @CreateDateColumn({ name: 'fecha_hora', type: 'timestamp' })
  fechaHora: Date;

  @ManyToOne(() => Solicitud, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud?: Relation<Solicitud>;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Relation<Usuario>;
}
