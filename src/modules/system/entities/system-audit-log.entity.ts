import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity('system_audit_logs')
export class SystemAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column()
  action: string;

  @Column({ name: 'target_table' })
  targetTable: string;

  @Column({ name: 'target_id', nullable: true })
  targetId: string;

  @Column({ type: 'jsonb', nullable: true, name: 'old_value' })
  oldValue: any;

  @Column({ type: 'jsonb', nullable: true, name: 'new_value' })
  newValue: any;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.auditLogs)
  @JoinColumn({ name: 'user_id' }) // Map vào cột user_id có sẵn
  user: User;
}
