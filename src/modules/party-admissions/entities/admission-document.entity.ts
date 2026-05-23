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
  
  @Entity('admission_documents')
  export class AdmissionDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'application_id', type: 'uuid' })
    applicationId: string;
  
    @ManyToOne(() => AdmissionApplication, (application) => application.documents, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'application_id' })
    application: AdmissionApplication;
  
    @Column({ name: 'step_id', type: 'uuid', nullable: true })
    stepId?: string;
  
    @ManyToOne(() => AdmissionStep, (step) => step.documents, {
      onDelete: 'SET NULL',
      nullable: true,
    })
    @JoinColumn({ name: 'step_id' })
    step?: AdmissionStep;
  
    @Column({ name: 'document_type', type: 'varchar', length: 100 })
    documentType: string;
  
    @Column({ name: 'title', type: 'varchar', length: 255 })
    title: string;
  
    @Column({ name: 'file_url', type: 'text' })
    fileUrl: string;
  
    @Column({ name: 'file_name', type: 'varchar', length: 255 })
    fileName: string;
  
    @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
    mimeType?: string;
  
    @Column({ name: 'file_size', type: 'bigint', nullable: true })
    fileSize?: string;
  
    @Column({ name: 'version_no', type: 'int', default: 1 })
    versionNo: number;
  
    @Column({ name: 'uploaded_by', type: 'uuid' })
    uploadedBy: string;
  
    @Column({ name: 'uploaded_at', type: 'timestamp', default: () => 'now()' })
    uploadedAt: Date;
  
    @Column({ name: 'status', type: 'varchar', length: 50, default: 'ACTIVE' })
    status: string;
  
    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  }