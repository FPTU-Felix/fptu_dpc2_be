import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { AdmissionApplication } from './admission-application.entity';
  import { AdmissionStepCode } from '../enums/admission-step.enum';
  import { AdmissionStepStatus } from '../enums/admission-status.enum';
import { AdmissionStepData } from './admission-step-data.entity';
import { AdmissionDocument } from './admission-document.entity';
import { AdmissionTask } from './admission-task.entity';

  
  @Entity('admission_steps')
  export class AdmissionStep {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'application_id', type: 'uuid' })
    applicationId: string;
  
    @ManyToOne(() => AdmissionApplication, (application) => application.steps, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'application_id' })
    application: AdmissionApplication;
  
    @Column({ name: 'step_code', type: 'varchar', length: 100 })
    stepCode: AdmissionStepCode;
  
    @Column({ name: 'step_name', type: 'varchar', length: 255 })
    stepName: string;
  
    @Column({ name: 'sequence_no', type: 'int' })
    sequenceNo: number;
  
    @Column({
      name: 'status',
      type: 'varchar',
      length: 50,
      default: AdmissionStepStatus.INCOMPLETE,
    })
    status: AdmissionStepStatus;
  
    @Column({ name: 'assigned_role', type: 'varchar', length: 50, nullable: true })
    assignedRole?: string;
  
    @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
    assignedUserId?: string;
  
    @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
    submittedBy?: string;
  
    @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
    reviewedBy?: string;
  
    @Column({ name: 'approved_by', type: 'uuid', nullable: true })
    approvedBy?: string;
  
    @Column({ name: 'rejected_by', type: 'uuid', nullable: true })
    rejectedBy?: string;
  
    @Column({ name: 'returned_by', type: 'uuid', nullable: true })
    returnedBy?: string;
  
    @Column({ name: 'started_at', type: 'timestamp', nullable: true })
    startedAt?: Date;
  
    @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
    submittedAt?: Date;
  
    @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
    approvedAt?: Date;
  
    @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
    rejectedAt?: Date;
  
    @Column({ name: 'returned_at', type: 'timestamp', nullable: true })
    returnedAt?: Date;
  
    @Column({ name: 'due_date', type: 'timestamp', nullable: true })
    dueDate?: Date;
  
    @Column({ name: 'note', type: 'text', nullable: true })
    note?: string;
  
    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason?: string;
  
    @OneToOne(() => AdmissionStepData, (data) => data.step)
    data: AdmissionStepData;
  
    @OneToMany(() => AdmissionDocument, (document) => document.step)
    documents: AdmissionDocument[];
  
    @OneToMany(() => AdmissionTask, (task) => task.step)
    tasks: AdmissionTask[];
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }