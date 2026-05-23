import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
  } from 'typeorm';
  import { AdmissionApplication } from './admission-application.entity';
  import { AdmissionStep } from './admission-step.entity';
  import { AdmissionAction } from '../enums/admission-action.enum';
  
  @Entity('admission_decision_logs')
  export class AdmissionDecisionLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'application_id', type: 'uuid' })
    applicationId: string;
  
    @ManyToOne(() => AdmissionApplication, (application) => application.decisionLogs, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'application_id' })
    application: AdmissionApplication;
  
    @Column({ name: 'step_id', type: 'uuid', nullable: true })
    stepId?: string;
  
    @ManyToOne(() => AdmissionStep, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'step_id' })
    step?: AdmissionStep;
  
    @Column({ name: 'action', type: 'varchar', length: 50 })
    action: AdmissionAction;
  
    @Column({ name: 'actor_id', type: 'uuid' })
    actorId: string;
  
    @Column({ name: 'actor_role', type: 'varchar', length: 50 })
    actorRole: string;
  
    @Column({ name: 'comment', type: 'text', nullable: true })
    comment?: string;
  
    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  }