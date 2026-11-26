import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Configuración del periodo tras el cual una solicitud abierta y sin ofertas
 * genera una alerta. Se guarda en una tabla de una sola fila (`id = 1`) para
 * que el valor viva en PostgreSQL y no dependa del archivo de configuración.
 */
@Entity('configuracion_alerta_sin_ofertas')
export class ConfiguracionAlerta {
  @PrimaryColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'minutos_sin_ofertas', type: 'int' })
  minutosSinOfertas: number;

  @UpdateDateColumn({ name: 'actualizada_en', type: 'timestamp' })
  actualizadaEn: Date;

  @Column({
    name: 'actualizado_por',
    type: 'uuid',
    nullable: true,
  })
  actualizadoPor: string | null;
}
