import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { EspecialidadTipo } from '../common/enums/especialidad-tipo.enum.js';
import { EstadoTrabajador } from '../common/enums/estado-trabajador.enum.js';
import { Documento } from './documento.entity.js';
import { TrabajadorZona } from './trabajador-zona.entity.js';
import { Usuario } from './usuario.entity.js';

@Entity('perfil_trabajador')
export class PerfilTrabajador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid', unique: true })
  usuarioId: string;

  @Column({
    name: 'especialidades',
    type: 'enum',
    enum: EspecialidadTipo,
    array: true,
  })
  especialidades: EspecialidadTipo[];

  @Column({ name: 'horarios', type: 'varchar', length: 200, nullable: true })
  horarios: string | null;

  @Column({ name: 'precios_estimados', type: 'jsonb' })
  preciosEstimados: Record<string, number>;

  @Column({ name: 'nivel_verificacion', type: 'int' })
  nivelVerificacion: number;

  @Column({
    name: 'promedio',
    type: 'numeric',
    precision: 3,
    scale: 2,
    transformer: {
      to: (value: number): number => value,
      from: (value: string): number => Number(value),
    },
  })
  promedio: number;

  @Column({ name: 'trabajos_completados', type: 'int' })
  trabajosCompletados: number;

  @Column({ name: 'acepto_contrato_digital', type: 'boolean' })
  aceptoContratoDigital: boolean;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoTrabajador,
  })
  estado: EstadoTrabajador;

  @Column({ name: 'fecha_pausa', type: 'timestamp', nullable: true })
  fechaPausa: Date | null;

  @Column({ name: 'vence_antecedentes', type: 'date', nullable: true })
  venceAntecedentes: string | null;

  @OneToOne(() => Usuario, (usuario) => usuario.perfilTrabajador, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Relation<Usuario>;

  @OneToMany(
    () => TrabajadorZona,
    (trabajadorZona) => trabajadorZona.trabajador,
  )
  trabajadorZonas?: Relation<TrabajadorZona[]>;

  @OneToMany(() => Documento, (documento) => documento.trabajador)
  documentos?: Relation<Documento[]>;
}

