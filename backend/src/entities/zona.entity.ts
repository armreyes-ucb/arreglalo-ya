import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { TrabajadorZona } from './trabajador-zona.entity.js';

@Entity('zona')
export class Zona {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nombre', type: 'varchar', length: 50 })
  nombre: string;

  @Column({ name: 'otb', type: 'varchar', length: 100 })
  otb: string;

  @Column({ name: 'municipio', type: 'varchar', length: 100 })
  municipio: string;

  @Column({ name: 'zonas_vecinas', type: 'text', array: true })
  zonasVecinas: string[];

  @OneToMany(() => TrabajadorZona, (trabajadorZona) => trabajadorZona.zona)
  trabajadorZonas?: Relation<TrabajadorZona[]>;
}
