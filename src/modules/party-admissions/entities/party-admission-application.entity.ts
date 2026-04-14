import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
import { PartyAdmissionStepEntity } from './party-admission-step.entity';
import { PartyAdmissionStepSubmissionEntity } from './party-admission-step-submission.entity';
import { PartyAdmissionStepReviewEntity } from './party-admission-step-review.entity';
import { PartyAdmissionDocumentEntity } from './party-admission-document.entity';
import { PartyAdmissionWorkflowLogEntity } from './party-admission-workflow-log.entity';
import { AdmissionOverallStatus } from '../enum/admission-overall-status';

@Entity('party_admission_applications')
@Index('idx_party_admission_applications_code', ['code'], { unique: true })
@Index('idx_party_admission_applications_outstanding_individual_id', [
  'outstandingIndividualId',
])
@Index('idx_party_admission_applications_overall_status', ['overallStatus'])
@Index('idx_party_admission_applications_current_step_code', [
  'currentStepCode',
])
@Index('idx_party_admission_applications_overall_status_current_step_code', [
  'overallStatus',
  'currentStepCode',
])
export class PartyAdmissionApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'uuid' })
  outstandingIndividualId: string;

  @Column({
    type: 'enum',
    enum: AdmissionOverallStatus,
    default: AdmissionOverallStatus.DRAFT,
  })
  overallStatus: AdmissionOverallStatus;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStep,
    enumName: 'admission_workflow_step_enum',
    default: AdmissionWorkflowStep.APPLICATION,
  })
  currentStepCode: AdmissionWorkflowStep;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStepStatus,
    enumName: 'admission_workflow_step_status_enum',
    default: AdmissionWorkflowStepStatus.NOT_STARTED,
  })
  currentStepStatus: AdmissionWorkflowStepStatus;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @OneToMany(() => PartyAdmissionStepEntity, (step) => step.application)
  steps: PartyAdmissionStepEntity[];

  @OneToMany(
    () => PartyAdmissionStepSubmissionEntity,
    (submission) => submission.applicationId,
  )
  submissions: PartyAdmissionStepSubmissionEntity[];

  @OneToMany(
    () => PartyAdmissionStepReviewEntity,
    (review) => review.applicationId,
  )
  reviews: PartyAdmissionStepReviewEntity[];

  @OneToMany(
    () => PartyAdmissionDocumentEntity,
    (document) => document.applicationId,
  )
  documents: PartyAdmissionDocumentEntity[];

  @OneToMany(() => PartyAdmissionWorkflowLogEntity, (log) => log.applicationId)
  workflowLogs: PartyAdmissionWorkflowLogEntity[];


  @CreateDateColumn()
  createdAt: Date;
}
