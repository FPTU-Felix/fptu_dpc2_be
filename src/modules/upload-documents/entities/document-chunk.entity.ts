import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DocumentAiKnowledge } from './document-ai-knowledge.entity';

@Entity('document_chunks')
export class DocumentChunkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ManyToOne(() => DocumentAiKnowledge, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document?: DocumentAiKnowledge;

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
    length: 768,
  })
  embedding?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}