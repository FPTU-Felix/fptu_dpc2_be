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
import { SystemAuditLog } from 'src/modules/system/entities/system-audit-log.entity';

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

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToOne(() => PartyMember, (member) => member.user)
  member: PartyMember;

  @OneToMany(() => SystemAuditLog, (log) => log.user)
  auditLogs: SystemAuditLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
