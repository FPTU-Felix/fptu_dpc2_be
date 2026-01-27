import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PartyMember } from '../../party-members/entities/party-member.entity';

@Entity('commendations')
export class Commendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => PartyMember, (member) => member.commendations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column()
  title: string; // Danh hiệu thi đua / Hình thức khen thưởng

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ name: 'decision_number', nullable: true })
  decisionNumber: string;

  @Column({ name: 'signing_authority', nullable: true })
  signingAuthority: string; // Cấp ký quyết định (Chi bộ, Đảng ủy...)

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
