import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('ai_chat_audit_logs')
export class AiChatAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', nullable: true })
  conversationId: string;

  @Column({ name: 'message_id', nullable: true })
  messageId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  @Column({ name: 'request_id', nullable: true })
  requestId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
