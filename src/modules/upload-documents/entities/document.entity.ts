import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DocumentCategory {
  LAW = 'LAW',
  INSTRUCTION = 'INSTRUCTION',
  FORM = 'FORM',
  GUIDE = 'GUIDE',
  OTHER = 'OTHER',
}

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl?: string;

  @Column({ name: 'content_text', type: 'text', nullable: true })
  contentText?: string;

  @Column({
    type: 'enum',
    enum: DocumentCategory,
    default: DocumentCategory.LAW,
  })
  category: DocumentCategory;

  @Column({ name: 'source_origin', type: 'varchar', length: 255, nullable: true })
  sourceOrigin?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

}