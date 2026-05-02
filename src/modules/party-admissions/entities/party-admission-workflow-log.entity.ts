import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
import { PartyAdmissionApplicationEntity } from './party-admission-application.entity';
import { PartyAdmissionStepEntity } from './party-admission-step.entity';
import { AdmissionWorkflowLogAction } from '../enum/party-admissions.enum';

@Entity('party_admission_workflow_logs')
@Index('idx_party_admission_workflow_logs_application_id', ['applicationId'])
@Index('idx_party_admission_workflow_logs_step_id', ['stepId'])
@Index('idx_party_admission_workflow_logs_created_at', ['createdAt'])
export class PartyAdmissionWorkflowLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @ManyToOne(
    () => PartyAdmissionApplicationEntity,
    (application) => application.workflowLogs,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'applicationId' })
  application: PartyAdmissionApplicationEntity;

  @Column({ type: 'uuid', nullable: true })
  stepId?: string;

  @ManyToOne(() => PartyAdmissionStepEntity, (step) => step.workflowLogs, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'stepId' })
  step?: PartyAdmissionStepEntity;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowLogAction,
  })
  action: AdmissionWorkflowLogAction;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStep,
    nullable: true,
  })
  fromStepCode?: AdmissionWorkflowStep;

  @Column({
    type: 'enum',
    enum: AdmissionWorkflowStep,
    nullable: true,
  })
  toStepCode?: AdmissionWorkflowStep;

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
  message?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  actorId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  actorRole?: string;

  @CreateDateColumn()
  createdAt: Date;
}
