import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { EstadoAlerta } from '../common/enums/estado-alerta.enum.js';
import { Solicitud } from './solicitud.entity.js';

/**
 * Alerta persistente para una solicitud que sigue abierta y no recibió
 * ninguna oferta después del periodo configurado. Solo puede existir una
 * alerta ACTIVA por solicitud (índice único parcial en la base de datos).
 */
@Entity('alerta_solicitud_sin_ofertas')
export class AlertaSolicitud {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid' })
  solicitudId: string;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoAlerta,
    enumName: 'estado_alerta',
  })
  estado: EstadoAlerta;

  @Column({ name: 'minutos_configurados', type: 'int' })
  minutosConfigurados: number;

  @Column({ name: 'vence_en_original', type: 'timestamp' })
  venceEnOriginal: Date;

  @CreateDateColumn({ name: 'creada_en', type: 'timestamp' })
  creadaEn: Date;

  @Column({
    name: 'resuelta_en',
    type: 'timestamp',
    nullable: true,
  })
  resueltaEn: Date | null;

  @Column({
    name: 'resuelta_por',
    type: 'uuid',
    nullable: true,
  })
  resueltaPor: string | null;

  @ManyToOne(() => Solicitud, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitud_id' })
  solicitud?: Relation<Solicitud>;
}
