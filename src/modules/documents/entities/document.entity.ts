import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentCategory } from '../../document-categories/entities/document-category.entity';
@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title', type: 'varchar', length: 500 })
  title: string; 

  @Column({ name: 'description', type: 'text', nullable: true }) // FIX: 'varchar' length 'max' -> 'text'
  description: string; 

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string; 

  @Column({ name: 'file_url', type: 'varchar', length: 1000 })
  fileUrl: string; 

  @Column({ name: 'uploaded_by', type: 'varchar', length: 255, default: 'Chi ủy' })
  uploadedBy: string; 

  @Column({ name: 'is_featured', type: 'boolean', default: false }) // FIX: 'bit' -> 'boolean'
  isFeatured: boolean; 

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => DocumentCategory, (category) => category.documents, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: DocumentCategory;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}