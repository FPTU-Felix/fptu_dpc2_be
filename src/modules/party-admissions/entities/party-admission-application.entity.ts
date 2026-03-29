import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdmissionOverallStatus } from '../enum/admission-overall-status';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
@Entity('party_admission_applications')
@Index('idx_party_admission_applications_outstanding_individual_id', [
  'outstandingIndividualId',
])
@Index('idx_party_admission_applications_overall_status', ['overallStatus'])
@Index('idx_party_admission_applications_current_step_code', [
  'currentStepCode',
])
export class PartyAdmissionApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
    default: AdmissionWorkflowStep.DRAFT,
  })
  currentStepCode: AdmissionWorkflowStep;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStepStatus,
    default: AdmissionWorkflowStepStatus.NOT_STARTED,
  })
  currentStepStatus: AdmissionWorkflowStepStatus;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  admittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  @Column({ type: 'text', nullable: true })
  latestReturnReason?: string;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;

  @Column({ type: 'uuid', nullable: true })
  updatedById?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
