import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdmissionStatus } from '../enum/admission-status.enum';
import { AdmissionStepCode } from '../enum/admission-step-code.enum';
import { AdmissionStepStatus } from '../enum/admission-step-status.enum';

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
    enum: AdmissionStatus,
    default: AdmissionStatus.DRAFT,
  })
  overallStatus: AdmissionStatus;

  @Column({
    type: 'enum',
    enum: AdmissionStepCode,
    default: AdmissionStepCode.APPLICATION,
  })
  currentStepCode: AdmissionStepCode;

  @Column({
    type: 'enum',
    enum: AdmissionStepStatus,
    default: AdmissionStepStatus.DRAFT,
  })
  currentStepStatus: AdmissionStepStatus;

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
