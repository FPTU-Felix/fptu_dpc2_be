import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PartyMember } from '../../party-members/entities/party-member.entity';

@Entity('disciplines')
export class Discipline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => PartyMember, (member) => member.disciplines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column()
  reason: string; // Lý do kỷ luật

  @Column({ type: 'timestamp' })
  date: Date; // Ngày ra quyết định

  @Column({ name: 'decision_number', nullable: true })
  decisionNumber: string; // Số quyết định

  @Column({ nullable: true })
  form: string; // Hình thức (Khiển trách, Cảnh cáo...)

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
