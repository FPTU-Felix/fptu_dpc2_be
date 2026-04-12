import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { AdmissionDocumentType } from '../enum/admission-document-type.enum';
  import { PartyAdmissionApplicationEntity } from './party-admission-application.entity';
  import { PartyAdmissionStepEntity } from './party-admission-step.entity';
  import { PartyAdmissionStepSubmissionEntity } from './party-admission-step-submission.entity';
  
  @Entity('party_admission_documents')
  @Index('idx_party_admission_documents_application_id', ['applicationId'])
  @Index('idx_party_admission_documents_step_id', ['stepId'])
  @Index('idx_party_admission_documents_submission_id', ['submissionId'])
  @Index('idx_party_admission_documents_document_type', ['documentType'])
  export class PartyAdmissionDocumentEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ type: 'uuid' })
    applicationId: string;
  
    @ManyToOne(() => PartyAdmissionApplicationEntity, (application) => application.documents, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'applicationId' })
    application: PartyAdmissionApplicationEntity;
  
    @Column({ type: 'uuid', nullable: true })
    stepId?: string;
  
    @ManyToOne(() => PartyAdmissionStepEntity, (step) => step.documents, {
      onDelete: 'SET NULL',
      nullable: true,
    })
    @JoinColumn({ name: 'stepId' })
    step?: PartyAdmissionStepEntity;
  
    @Column({ type: 'uuid', nullable: true })
    submissionId?: string;
  
    @ManyToOne(() => PartyAdmissionStepSubmissionEntity, (submission) => submission.documents, {
      onDelete: 'SET NULL',
      nullable: true,
    })
    @JoinColumn({ name: 'submissionId' })
    submission?: PartyAdmissionStepSubmissionEntity;
  
    @Column({
      type: 'enum',
      enum: AdmissionDocumentType,
    })
    documentType: AdmissionDocumentType;
  
    @Column({ type: 'varchar', length: 100, nullable: true })
    bucket?: string;
  
    @Column({ type: 'varchar', length: 255 })
    originalFileName: string;
  
    @Column({ type: 'varchar', length: 255 })
    storedFileName: string;
  
    @Column({ type: 'varchar', length: 500 })
    objectKey: string;
  
    @Column({ type: 'varchar', length: 100, nullable: true })
    mimeType?: string;
  
    @Column({ type: 'bigint', nullable: true })
    size?: number;
  
    @Column({ type: 'int', default: 1 })
    version: number;
  
    @Column({ type: 'boolean', default: true })
    isLatest: boolean;
  
    @Column({ type: 'text', nullable: true })
    description?: string;
  
    @Column({ type: 'uuid', nullable: true })
    uploadedById?: string;
  
    @Column({ type: 'timestamp', nullable: true })
    uploadedAt?: Date;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }