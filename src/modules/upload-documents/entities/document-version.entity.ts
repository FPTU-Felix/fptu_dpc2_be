import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DocumentVersionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('document_versions')
export class DocumentVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'version_label', type: 'varchar', length: 100 })
  versionLabel: string;

  @Column({ name: 'file_name', type: 'varchar', length: 500 })
  fileName: string;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl?: string;

  @Column({ name: 'file_key', type: 'varchar', length: 1000, nullable: true })
  fileKey?: string;

  @Column({ name: 'file_type', type: 'varchar', length: 255, nullable: true })
  fileType?: string;

  @Column({ name: 'file_size', type: 'varchar', length: 50, nullable: true })
  fileSize?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  checksum?: string;

  @Column({ name: 'extracted_text', type: 'text', nullable: true })
  extractedText?: string;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy?: string | null;
  @Column({
    name: 'ingestion_status',
    type: 'enum',
    enum: DocumentVersionStatus,
    default: DocumentVersionStatus.PENDING,
  })
  ingestionStatus: DocumentVersionStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
