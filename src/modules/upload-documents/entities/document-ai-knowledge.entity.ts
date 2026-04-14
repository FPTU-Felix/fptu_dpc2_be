import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PartyCell } from '../../party-cells/entities/party-cell.entity';

@Entity('document_ai_knowledge')
export class DocumentAiKnowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'party_cell_id', nullable: true })
  partyCellId?: string;

  @ManyToOne(() => PartyCell, { nullable: true })
  @JoinColumn({ name: 'party_cell_id' })
  partyCell?: PartyCell;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  user?: User;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl?: string;

  @Column({ name: 'object_name', type: 'varchar', length: 1000, nullable: true })
  objectName?: string;

  @Column({ name: 'bucket', type: 'varchar', length: 255, nullable: true })
  bucket?: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName?: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 255, nullable: true })
  mimeType?: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}