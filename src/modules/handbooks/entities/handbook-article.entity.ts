import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HandbookCategory } from './handbook-category.entity';
// Import User entity của m nếu cần nối bảng lấy tên người tạo
// import { User } from '../../users/entities/user.entity';

export enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

@Entity('handbook_articles')
export class HandbookArticle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true, name: 'short_description' })
  shortDescription: string;

  @Column({ type: 'text' }) // Chứa HTML của Rich Text Editor
  content: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'thumbnail_url',
  })
  thumbnailUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'author_name' })
  authorName: string; // Tên tác giả hiển thị trên UI

  @Column({ type: 'enum', enum: ArticleStatus, default: ArticleStatus.DRAFT })
  status: ArticleStatus;

  @Column({ type: 'boolean', default: false, name: 'is_pinned' })
  isPinned: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_highlighted' })
  isHighlighted: boolean;

  @Column({ type: 'int', default: 0, name: 'view_count' })
  viewCount: number;

  // Khóa ngoại nối sang Category
  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @ManyToOne(() => HandbookCategory, (category) => category.articles, {
    onDelete: 'SET NULL', // Xóa danh mục thì bài viết không bị bay màu, chỉ set Null
  })
  @JoinColumn({ name: 'category_id' })
  category: HandbookCategory;

  // Tùy chọn: Lưu lại id của Bí thư người tạo bài (Để Audit)
  @Column({ name: 'created_by_id', nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
