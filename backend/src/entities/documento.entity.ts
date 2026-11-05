import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { EstadoRevision } from '../common/enums/estado-revision.enum.js';
import { PerfilTrabajador } from './perfil-trabajador.entity.js';
import { Usuario } from './usuario.entity.js';

@Entity('documento')
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trabajador_id', type: 'uuid' })
  trabajadorId: string;

  @Column({ name: 'tipo', type: 'varchar', length: 50 })
  tipo: string;

  @Column({ name: 'archivo_privado_url', type: 'text' })
  archivoPrivadoUrl: string;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoRevision,
  })
  estadoRevision: EstadoRevision;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo: string | null;

  @Column({ name: 'revisado_por', type: 'uuid', nullable: true })
  revisadoPorId: string | null;

  @Column({ name: 'vence_en', type: 'date', nullable: true })
  venceEn: string | null;

  @CreateDateColumn({ name: 'fecha_carga', type: 'timestamp' })
  fechaCarga: Date;

  @ManyToOne(() => PerfilTrabajador, (perfil) => perfil.documentos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trabajador_id' })
  trabajador?: Relation<PerfilTrabajador>;

  @ManyToOne(() => Usuario, (usuario) => usuario.documentosRevisados, {
    nullable: true,
  })
  @JoinColumn({ name: 'revisado_por' })
  revisadoPor?: Relation<Usuario> | null;
}
