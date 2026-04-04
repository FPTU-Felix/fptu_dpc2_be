import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { PartyAdmissionApplicationEntity } from './party-admission-application.entity';
import { PartyAdmissionStepEntity } from './party-admission-step.entity';
import { PartyAdmissionDocumentEntity } from './party-admission-document.entity';
import { PartyAdmissionStepReviewEntity } from './party-admission-step-review.entity';

@Entity('party_admission_step_submissions')
@Index('idx_party_admission_step_submissions_application_id', ['applicationId'])
@Index('idx_party_admission_step_submissions_step_id', ['stepId'])
@Index('idx_party_admission_step_submissions_is_latest', ['isLatest'])
export class PartyAdmissionStepSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => PartyAdmissionApplicationEntity, (application) => application.submissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'applicationId' })
  application: PartyAdmissionApplicationEntity;

  @Column({ type: 'uuid' })
  stepId: string;

  @ManyToOne(() => PartyAdmissionStepEntity, (step) => step.submissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stepId' })
  step: PartyAdmissionStepEntity;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStep,
  })
  stepCode: AdmissionWorkflowStep;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'jsonb', nullable: true })
  formData?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'uuid', nullable: true })
  submittedById?: string;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'boolean', default: true })
  isLatest: boolean;

  @OneToMany(() => PartyAdmissionDocumentEntity, (document) => document.submission)
  documents: PartyAdmissionDocumentEntity[];

  @OneToMany(() => PartyAdmissionStepReviewEntity, (review) => review.submission)
  reviews: PartyAdmissionStepReviewEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}