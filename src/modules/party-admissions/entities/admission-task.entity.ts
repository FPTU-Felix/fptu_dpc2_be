import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { AdmissionApplication } from './admission-application.entity';
  import { AdmissionStep } from './admission-step.entity';
  import { AdmissionTaskStatus } from '../enums/admission-status.enum';
  
  @Entity('admission_tasks')
  export class AdmissionTask {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'application_id', type: 'uuid' })
    applicationId: string;
  
    @ManyToOne(() => AdmissionApplication, (application) => application.tasks, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'application_id' })
    application: AdmissionApplication;
  
    @Column({ name: 'step_id', type: 'uuid' })
    stepId: string;
  
    @ManyToOne(() => AdmissionStep, (step) => step.tasks, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'step_id' })
    step: AdmissionStep;
  
    @Column({ name: 'task_type', type: 'varchar', length: 100 })
    taskType: string;
  
    @Column({ name: 'assigned_role', type: 'varchar', length: 50, nullable: true })
    assignedRole?: string;
  
    @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
    assignedUserId?: string;
  
    @Column({
      name: 'status',
      type: 'varchar',
      length: 50,
      default: AdmissionTaskStatus.PENDING,
    })
    status: AdmissionTaskStatus;
  
    @Column({ name: 'title', type: 'varchar', length: 255 })
    title: string;
  
    @Column({ name: 'description', type: 'text', nullable: true })
    description?: string;
  
    @Column({ name: 'action_url', type: 'text', nullable: true })
    actionUrl?: string;
  
    @Column({ name: 'due_date', type: 'timestamp', nullable: true })
    dueDate?: Date;
  
    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt?: Date;
  
    @Column({ name: 'completed_by', type: 'uuid', nullable: true })
    completedBy?: string;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }