import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum.js';
import { Rol } from '../common/enums/rol.enum.js';
import { CuentaBancaria } from './cuenta-bancaria.entity.js';
import { Documento } from './documento.entity.js';
import { PerfilTrabajador } from './perfil-trabajador.entity.js';

@Entity('usuario')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nombre_completo', type: 'varchar', length: 150 })
  nombreCompleto: string;

  @Column({ name: 'telefono', type: 'varchar', length: 20, unique: true })
  telefono: string;

  @Column({ name: 'password_hash', type: 'varchar' })
  passwordHash: string;

  @Column({ name: 'roles', type: 'text', array: true })
  roles: Rol[];

  @Column({ name: 'estado', type: 'enum', enum: EstadoUsuario })
  estado: EstadoUsuario;

  @Column({ name: 'intentos_fallidos', type: 'int' })
  intentosFallidos: number;

  @Column({ name: 'bloqueado_hasta', type: 'timestamp', nullable: true })
  bloqueadoHasta: Date | null;

  @Column({ name: 'acepto_terminos', type: 'boolean' })
  aceptoTerminos: boolean;

  @CreateDateColumn({ name: 'fecha_registro', type: 'timestamp' })
  fechaRegistro: Date;

  @OneToOne(() => PerfilTrabajador, (perfil) => perfil.usuario)
  perfilTrabajador?: Relation<PerfilTrabajador>;

  @OneToOne(() => CuentaBancaria, (cuenta) => cuenta.usuario)
  cuentaBancaria?: Relation<CuentaBancaria>;

  @OneToMany(() => Documento, (documento) => documento.revisadoPor)
  documentosRevisados?: Relation<Documento[]>;
}
