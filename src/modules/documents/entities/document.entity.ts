import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DocumentCategory } from '../../document-categories/entities/document-category.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid') // Đổi sang UUID
  id: string;

  @Column({ name: 'title', type: 'varchar', length: 500 })
  title: string;

  @Index({ unique: true })
  @Column({ name: 'slug', type: 'varchar', length: 500 })
  slug: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'file_url', type: 'varchar', length: 1000 })
  fileUrl: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_type', type: 'varchar', length: 10, nullable: true })
  fileType: string; 

  @Column({ name: 'uploaded_by', type: 'varchar', length: 255, nullable: true })
  uploadedBy: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' }) 
  status: string;

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ name: 'download_count', type: 'int', default: 0 })
  downloadCount: number;

  @Column({ name: 'category_id', type: 'uuid', nullable: true }) // Đổi sang UUID
  categoryId: string;

  @ManyToOne(() => DocumentCategory, (category) => category.documents, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: DocumentCategory;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}