import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AiChatMessage } from './ai-chat-message.entity';

@Entity('ai_chat_message_embeddings')
export class AiChatMessageEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id' })
  messageId: string;

  @ManyToOne(() => AiChatMessage, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message: AiChatMessage;

  @Column({
    type: 'vector',
    length: 1536,
  })
  embedding: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
