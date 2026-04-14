import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
import { PartyAdmissionApplicationEntity } from './party-admission-application.entity';
import { PartyAdmissionStepSubmissionEntity } from './party-admission-step-submission.entity';
import { PartyAdmissionStepReviewEntity } from './party-admission-step-review.entity';
import { PartyAdmissionDocumentEntity } from './party-admission-document.entity';
import { PartyAdmissionWorkflowLogEntity } from './party-admission-workflow-log.entity';

@Entity('party_admission_steps')
@Unique('uq_party_admission_steps_application_step_code', [
  'applicationId',
  'stepCode',
])
@Index('idx_party_admission_steps_application_id', ['applicationId'])
@Index('idx_party_admission_steps_status', ['status'])
@Index('idx_party_admission_steps_is_current', ['isCurrent'])
export class PartyAdmissionStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @ManyToOne(
    () => PartyAdmissionApplicationEntity,
    (application) => application.steps,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'applicationId' })
  application: PartyAdmissionApplicationEntity;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStep,
    enumName: 'admission_workflow_step_enum',
  })
  stepCode: AdmissionWorkflowStep;

  @Column({ type: 'varchar', length: 255 })
  stepName: string;

  @Column({ type: 'int' })
  stepOrder: number;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStepStatus,
    enumName: 'admission_workflow_step_status_enum',
    default: AdmissionWorkflowStepStatus.NOT_STARTED,
  })
  status: AdmissionWorkflowStepStatus;

  @Column({ type: 'boolean', default: true })
  isLocked: boolean;

  @Column({ type: 'boolean', default: false })
  isCurrent: boolean;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'uuid', nullable: true })
  assignedToId?: string;

  @Column({ type: 'uuid', nullable: true })
  processedById?: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt?: Date;

  @Column({ type: 'text', nullable: true })
  note?: string;

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
}
