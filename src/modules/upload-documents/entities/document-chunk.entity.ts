import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('document_chunks')
export class DocumentChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_version_id', type: 'uuid' })
  documentVersionId: string;

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'page_number', type: 'int', nullable: true })
  pageNumber?: number;

  @Column({
    name: 'section_path',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  sectionPath?: string;

  @Column({ name: 'token_count', type: 'int', nullable: true })
  tokenCount?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({
    type: 'vector',
    name: 'embedding',
    nullable: true,
  })
  embedding?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}