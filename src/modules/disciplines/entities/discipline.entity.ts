import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PartyMember } from 'src/modules/party-members/entities/party-member.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('disciplines')
export class Discipline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => PartyMember)
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column({ type: 'text' })
  reason: string; // Lý do kỷ luật

  @Column({ type: 'date' })
  date: string; // Ngày ra quyết định

  @Column({ name: 'decision_number', length: 100 })
  decisionNumber: string;

  // Hình thức kỷ luật (Khiển trách, Cảnh cáo, Cách chức, Khai trừ)
  @Column({ length: 100 })
  form: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // File Quyết định kỷ luật (Bắt buộc)
  @Column({ name: 'decision_file_url' })
  decisionFileUrl: string;

  // Vết kiểm toán
  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
