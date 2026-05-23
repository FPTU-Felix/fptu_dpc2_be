import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { OutstandingIndividual } from './outstanding-individual.entity';
  import { AdmissionStepCode } from '../enums/admission-step.enum';
  import { AdmissionOverallStatus } from '../enums/admission-status.enum';

import { AdmissionDecisionLog } from './admission-decision-log.entity';
import { AdmissionStep } from './admission-step.entity';
import { AdmissionDocument } from './admission-document.entity';
import { AdmissionTask } from './admission-task.entity';
  
  @Entity('admission_applications')
  export class AdmissionApplication {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'outstanding_individual_id', type: 'uuid' })
    outstandingIndividualId: string;
  
    @ManyToOne(() => OutstandingIndividual, (individual) => individual.applications)
    @JoinColumn({ name: 'outstanding_individual_id' })
    outstandingIndividual: OutstandingIndividual;
  
    @Column({ name: 'application_code', type: 'varchar', length: 50, unique: true })
    applicationCode: string;
  
    @Column({ name: 'current_step', type: 'varchar', length: 100 })
    currentStep: AdmissionStepCode;
  
    @Column({
      name: 'overall_status',
      type: 'varchar',
      length: 50,
      default: AdmissionOverallStatus.IN_PROGRESS,
    })
    overallStatus: AdmissionOverallStatus;
  
    @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
    submittedBy?: string;
  
    @Column({ name: 'assigned_committee_id', type: 'uuid', nullable: true })
    assignedCommitteeId?: string;
  
    @Column({ name: 'assigned_secretary_id', type: 'uuid', nullable: true })
    assignedSecretaryId?: string;
  
    @Column({ name: 'assigned_deputy_secretary_id', type: 'uuid', nullable: true })
    assignedDeputySecretaryId?: string;
  
    @Column({ name: 'final_decision', type: 'varchar', length: 50, nullable: true })
    finalDecision?: string;
  
    @Column({ name: 'final_decision_note', type: 'text', nullable: true })
    finalDecisionNote?: string;
  
    @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
    submittedAt?: Date;
  
    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt?: Date;
  
    @OneToMany(() => AdmissionStep, (step) => step.application)
    steps: AdmissionStep[];
  
    @OneToMany(() => AdmissionDocument, (document) => document.application)
    documents: AdmissionDocument[];
  
    @OneToMany(() => AdmissionTask, (task) => task.application)
    tasks: AdmissionTask[];
  
    @OneToMany(() => AdmissionDecisionLog, (log) => log.application)
    decisionLogs: AdmissionDecisionLog[];
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt?: Date;
  }