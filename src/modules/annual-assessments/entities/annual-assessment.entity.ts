import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PartyMember } from '../../party-members/entities/party-member.entity';

// Enum xếp loại: HTXSNV = Hoàn thành xuất sắc nhiệm vụ, v.v.
export enum AssessmentRankEnum {
  EXCELLENT = 'HTXSNV',
  GOOD = 'HTTNV',
  COMPLETED = 'HTNV',
  NOT_COMPLETED = 'KHTNV',
}

@Entity('annual_assessments')
export class AnnualAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => PartyMember, (member) => member.annualAssessments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column()
  year: number; // Năm đánh giá

  @Column({
    type: 'enum',
    enum: AssessmentRankEnum,
    default: AssessmentRankEnum.COMPLETED,
  })
  rank: AssessmentRankEnum;

  @Column({ type: 'text', nullable: true })
  remarks: string; // Nhận xét ưu/khuyết điểm

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
