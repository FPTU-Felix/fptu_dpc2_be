import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
import { PartyAdmissionApplicationEntity } from './party-admission-application.entity';
import { PartyAdmissionStepEntity } from './party-admission-step.entity';
import { PartyAdmissionStepSubmissionEntity } from './party-admission-step-submission.entity';
import { BaseEntity } from 'src/common/base.entity';
import { AdmissionReviewAction } from '../enum/party-admissions.enum';

@Entity('party_admission_step_reviews')
@Index('idx_party_admission_step_reviews_application_id', ['applicationId'])
@Index('idx_party_admission_step_reviews_step_id', ['stepId'])
@Index('idx_party_admission_step_reviews_submission_id', ['submissionId'])
export class PartyAdmissionStepReviewEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => PartyAdmissionApplicationEntity, (application) => application.reviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'applicationId' })
  application: PartyAdmissionApplicationEntity;

  @Column({ type: 'uuid' })
  stepId: string;

  @ManyToOne(() => PartyAdmissionStepEntity, (step) => step.reviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stepId' })
  step: PartyAdmissionStepEntity;

  @Column({ type: 'uuid', nullable: true })
  submissionId?: string;

  @ManyToOne(() => PartyAdmissionStepSubmissionEntity, (submission) => submission.reviews, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'submissionId' })
  submission?: PartyAdmissionStepSubmissionEntity;

  @Column({
    type: 'enum',
    enum: AdmissionReviewAction,
  })
  action: AdmissionReviewAction;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStepStatus,
    nullable: true,
  })
  fromStatus?: AdmissionWorkflowStepStatus;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStepStatus,
    nullable: true,
  })
  toStatus?: AdmissionWorkflowStepStatus;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'uuid', nullable: true })
  reviewerId?: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

}