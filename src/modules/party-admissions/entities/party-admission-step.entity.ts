import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
@Entity('party_admission_steps')
@Unique('uq_party_admission_steps_application_step_code', [
  'applicationId',
  'stepCode',
])
@Index('idx_party_admission_steps_application_id', ['applicationId'])
@Index('idx_party_admission_steps_status', ['status'])
export class PartyAdmissionStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStep,
  })
  stepCode: AdmissionWorkflowStep;

  @Column({ type: 'varchar', length: 255 })
  stepName: string;

  @Column({ type: 'int' })
  stepOrder: number;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStepStatus,
    default: AdmissionWorkflowStepStatus.IN_PROGRESS,
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

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'text', nullable: true })
  resultNote?: string;

  @Column({ type: 'text', nullable: true })
  returnReason?: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
