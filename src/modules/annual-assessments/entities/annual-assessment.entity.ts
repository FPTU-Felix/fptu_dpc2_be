import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AssessmentStatus, AssessmentRank } from 'src/common/enums';
import { PartyMember } from 'src/modules/party-members/entities/party-member.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('annual_assessments')
@Unique(['memberId', 'year'])
export class AnnualAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => PartyMember)
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'enum', enum: AssessmentRank, name: 'self_rank' })
  selfRank: AssessmentRank;

  @Column({ name: 'assessment_file_url', nullable: true })
  assessmentFileUrl: string;

  @Column({ type: 'jsonb', name: 'criteria_checklist', nullable: true })
  criteriaChecklist?: any;

  @Column({ type: 'int', nullable: true })
  score?: number;

  @Column({
    type: 'enum',
    enum: AssessmentRank,
    name: 'final_rank',
    nullable: true,
  })
  finalRank: AssessmentRank;

  @Column({
    type: 'enum',
    enum: AssessmentStatus,
    default: AssessmentStatus.PENDING,
  })
  status: AssessmentStatus;

  @Column({ name: 'reviewer_id', nullable: true })
  reviewerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
