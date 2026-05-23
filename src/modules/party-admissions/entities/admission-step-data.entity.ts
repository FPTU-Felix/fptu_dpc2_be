import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { AdmissionStep } from './admission-step.entity';
  
  @Entity('admission_step_data')
  export class AdmissionStepData {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'step_id', type: 'uuid' })
    stepId: string;
  
    @OneToOne(() => AdmissionStep, (step) => step.data, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'step_id' })
    step: AdmissionStep;
  
    @Column({ name: 'data', type: 'jsonb' })
    data: Record<string, any>;
  
    @Column({ name: 'created_by', type: 'uuid' })
    createdBy: string;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }