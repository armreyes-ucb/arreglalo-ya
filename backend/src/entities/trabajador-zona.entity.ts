import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { PerfilTrabajador } from './perfil-trabajador.entity.js';
import { Zona } from './zona.entity.js';

@Entity('trabajador_zona')
export class TrabajadorZona {
  @PrimaryColumn({ name: 'trabajador_id', type: 'uuid' })
  trabajadorId: string;

  @PrimaryColumn({ name: 'zona_id', type: 'int' })
  zonaId: number;

  @ManyToOne(
    () => PerfilTrabajador,
    (perfilTrabajador) => perfilTrabajador.trabajadorZonas,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'trabajador_id' })
  trabajador?: Relation<PerfilTrabajador>;

  @ManyToOne(() => Zona, (zona) => zona.trabajadorZonas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'zona_id' })
  zona?: Relation<Zona>;
}
