import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { PartyMember } from '../../party-members/entities/party-member.entity';
import { SystemLog } from 'src/modules/system/entities/system-log.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'hashed_refresh_token', nullable: true, type: 'varchar' })
  hashedRefreshToken: string | null;

  @Column({ name: 'role_id', nullable: true })
  roleId: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: true }) // Mặc định là true khi Admin tạo mới
  isFirstLogin: boolean;

  @Column({ name: 'reset_password_token', type: 'varchar', nullable: true })
  resetPasswordToken: string | null;

  @Column({ name: 'reset_password_expires', nullable: true, type: 'timestamp' })
  resetPasswordExpires: Date | null;

  @Column({
    name: 'last_forgot_password_at',
    nullable: true,
    type: 'timestamp',
  })
  lastForgotPasswordAt: Date | null;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToOne(() => PartyMember, (member) => member.user)
  member: PartyMember;

  @OneToMany(() => SystemLog, (log) => log.actor)
  systemLogs: SystemLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
