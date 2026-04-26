import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AiChatConversation } from './ai-chat-conversation.entity';

type UUID = string;

export enum AiChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool',
}

@Entity('ai_chat_messages')
export class AiChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: UUID;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: UUID;

  @ManyToOne(() => AiChatConversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: AiChatConversation;

  @Column({
    type: 'varchar',
    length: 20,
  })
  role: AiChatRole;

  @Column({ type: 'text' })
  content: string;

  @Column({
    name: 'parent_message_id',
    type: 'uuid',
    nullable: true,
  })
  parentMessageId: UUID | null;

  @Column({
    name: 'is_error',
    type: 'boolean',
    default: false,
  })
  isError: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}