import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
// Đảm bảo đường dẫn này chính xác với cấu trúc thư mục của bạn
import { Document } from '../../documents/entities/document.entity';

@Entity('document_categories')
export class DocumentCategory {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ name: 'slug', type: 'varchar', length: 255 })
  slug: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'color', type: 'varchar', length: 50, default: '#D32F2F' })
  color: string;

  @Column({ name: 'icon', type: 'varchar', length: 100, nullable: true })
  icon: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => Document, (document) => document.category)
  documents: Document[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}