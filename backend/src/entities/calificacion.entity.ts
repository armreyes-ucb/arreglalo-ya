import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Solicitud } from './solicitud.entity.js';
import { Usuario } from './usuario.entity.js';

@Entity('calificacion')
export class Calificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid' })
  solicitudId: string;

  @Column({ name: 'autor_id', type: 'uuid' })
  autorId: string;

  @Column({ name: 'destinatario_id', type: 'uuid' })
  destinatarioId: string;

  @Column({ name: 'estrellas', type: 'int' })
  estrellas: number;

  @Column({ name: 'calidad', type: 'int', nullable: true })
  calidad: number | null;

  @Column({ name: 'puntualidad', type: 'int', nullable: true })
  puntualidad: number | null;

  @Column({ name: 'trato', type: 'int', nullable: true })
  trato: number | null;

  @Column({ name: 'precio_justo', type: 'int', nullable: true })
  precioJusto: number | null;

  @Column({ name: 'comentario', type: 'text', nullable: true })
  comentario: string | null;

  @Column({
    name: 'respuesta_trabajador',
    type: 'text',
    nullable: true,
  })
  respuestaTrabajador: string | null;

  @Column({ name: 'fecha', type: 'date' })
  fecha: string;

  @ManyToOne(
    () => Solicitud,
    (solicitud) => solicitud.calificaciones,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'solicitud_id' })
  solicitud?: Relation<Solicitud>;

  @ManyToOne(
    () => Usuario,
    (usuario) => usuario.calificacionesEscritas,
  )
  @JoinColumn({ name: 'autor_id' })
  autor?: Relation<Usuario>;

  @ManyToOne(
    () => Usuario,
    (usuario) => usuario.calificacionesRecibidas,
  )
  @JoinColumn({ name: 'destinatario_id' })
  destinatario?: Relation<Usuario>;
}
