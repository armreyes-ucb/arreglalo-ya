import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoSolicitud } from '../common/enums/estado-solicitud.enum.js';
import { PerfilTrabajador } from './perfil-trabajador.entity.js';
import { Usuario } from './usuario.entity.js';
import { Zona } from './zona.entity.js';

@Entity('solicitud')
export class Solicitud {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cliente_id', type: 'uuid' })
  clienteId: string;

  @Column({
    name: 'trabajador_confirmado_id',
    type: 'uuid',
    nullable: true,
  })
  trabajadorConfirmadoId: string | null;

  @Column({ name: 'zona_id', type: 'int' })
  zonaId: number;

  @Column({
    name: 'especialidad',
    type: 'enum',
    enum: EspecialidadTipo,
  })
  especialidad: EspecialidadTipo;

  @Column({
    name: 'tipo_problema',
    type: 'varchar',
    length: 100,
  })
  tipoProblema: string;

  @Column({ name: 'descripcion', type: 'text' })
  descripcion: string;

  @Column({ name: 'fotos_urls', type: 'text', array: true })
  fotosUrls: string[];

  @Column({ name: 'direccion_oculta', type: 'text' })
  direccionOculta: string;

  @Column({
    name: 'fecha_cita_preferida',
    type: 'timestamp',
  })
  fechaCitaPreferida: Date;

  @Column({ name: 'urgente', type: 'boolean' })
  urgente: boolean;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoSolicitud,
  })
  estado: EstadoSolicitud;

  @CreateDateColumn({ name: 'creada_en', type: 'timestamp' })
  creadaEn: Date;

  @Column({ name: 'vence_en', type: 'timestamp' })
  venceEn: Date;

  @Column({
    name: 'entro_al_tope',
    type: 'timestamp',
    nullable: true,
  })
  entroAlTope: Date | null;

  @Column({
    name: 'cerrada_en',
    type: 'timestamp',
    nullable: true,
  })
  cerradaEn: Date | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'cliente_id' })
  cliente?: Relation<Usuario>;

  @ManyToOne(() => PerfilTrabajador, { nullable: true })
  @JoinColumn({ name: 'trabajador_confirmado_id' })
  trabajadorConfirmado?: Relation<PerfilTrabajador> | null;

  @ManyToOne(() => Zona)
  @JoinColumn({ name: 'zona_id' })
  zona?: Relation<Zona>;
}
