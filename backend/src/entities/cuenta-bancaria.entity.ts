import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Usuario } from './usuario.entity.js';

@Entity('cuenta_bancaria')
export class CuentaBancaria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid', unique: true })
  usuarioId: string;

  @Column({ name: 'banco', type: 'varchar', length: 100 })
  banco: string;

  @Column({ name: 'numero_cuenta_cifrado', type: 'text' })
  numeroCuentaCifrado: string;

  @Column({ name: 'titular', type: 'varchar', length: 150 })
  titular: string;

  @OneToOne(() => Usuario, (usuario) => usuario.cuentaBancaria, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Relation<Usuario>;
}
