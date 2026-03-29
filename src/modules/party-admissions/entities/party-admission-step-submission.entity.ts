import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
@Entity('party_admission_step_submissions')
@Index('idx_party_admission_step_submissions_application_id', ['applicationId'])
@Index('idx_party_admission_step_submissions_step_id', ['stepId'])
export class PartyAdmissionStepSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({ type: 'uuid' })
  stepId: string;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStep,
  })
  stepCode: AdmissionWorkflowStep;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStepStatus,
    default: AdmissionWorkflowStepStatus.PENDING,
  })
  status: AdmissionWorkflowStepStatus;

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

  @CreateDateColumn()
  createdAt: Date;
}
