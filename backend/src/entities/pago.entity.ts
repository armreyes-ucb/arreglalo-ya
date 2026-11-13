import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { EstadoQr } from '../common/enums/estado-qr.enum.js';
import { Solicitud } from './solicitud.entity.js';

const numericToNumber = {
  to: (value: number): number => value,
  from: (value: string): number => Number(value),
};

@Entity('pago')
export class Pago {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitud_id', type: 'uuid', unique: true })
  solicitudId: string;

  @Column({
    name: 'precio_total_acordado',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToNumber,
  })
  precioTotalAcordado: number;

  @Column({
    name: 'pago_inicial_25',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToNumber,
  })
  pagoInicial25: number;

  @Column({
    name: 'parte_trabajador_20',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToNumber,
  })
  parteTrabajador20: number;

  @Column({
    name: 'comision_5',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToNumber,
  })
  comision5: number;

  @Column({
    name: 'saldo_75',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericToNumber,
  })
  saldo75: number;

  @Column({ name: 'codigo_qr_data', type: 'text', nullable: true })
  codigoQrData: string | null;

  @Column({
    name: 'qr_vence_en',
    type: 'timestamp',
    nullable: true,
  })
  qrVenceEn: Date | null;

  @Column({
    name: 'estado_qr',
    type: 'enum',
    enum: EstadoQr,
    default: EstadoQr.PENDIENTE,
  })
  estadoQr: EstadoQr;

  @Column({
    name: 'ya_pague_cliente',
    type: 'boolean',
    default: false,
  })
  yaPagueCliente: boolean;

  @Column({
    name: 'fecha_ya_pague',
    type: 'timestamp',
    nullable: true,
  })
  fechaYaPague: Date | null;

  @Column({
    name: 'saldo_75_confirmado_trabajador',
    type: 'boolean',
    default: false,
  })
  saldo75ConfirmadoTrabajador: boolean;

  @Column({
    name: 'fecha_confirmacion_trabajador',
    type: 'timestamp',
    nullable: true,
  })
  fechaConfirmacionTrabajador: Date | null;

  @Column({
    name: 'transferido_al_trabajador',
    type: 'boolean',
    default: false,
  })
  transferidoAlTrabajador: boolean;

  @Column({
    name: 'comprobante_transferencia',
    type: 'text',
    nullable: true,
  })
  comprobanteTransferencia: string | null;

  @OneToOne(() => Solicitud)
  @JoinColumn({ name: 'solicitud_id' })
  solicitud?: Relation<Solicitud>;
}
