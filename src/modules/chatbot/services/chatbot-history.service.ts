import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiChatConversation } from '../entities/ai-chat-conversation.entity';
import {
  AiChatMessage,
  AiChatRole,
} from '../entities/ai-chat-message.entity';

@Injectable()
export class ChatbotHistoryService {
  constructor(
    @InjectRepository(AiChatConversation)
    private readonly conversationRepo: Repository<AiChatConversation>,

    @InjectRepository(AiChatMessage)
    private readonly messageRepo: Repository<AiChatMessage>,
  ) {}

  async getUserConversations(userId: string) {
    return this.conversationRepo.find({
      where: {
        userId,
        isDeleted: false,
      },
      order: {
        isPinned: 'DESC',
        lastMessageAt: 'DESC',
      },
      select: {
        id: true,
        userId: true,
        title: true,
        isPinned: true,
        isDeleted: true,
        lastMessageAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getConversationDetail(params: {
    conversationId: string;
    userId: string;
  }) {
    const conversation = await this.conversationRepo.findOne({
      where: {
        id: params.conversationId,
        userId: params.userId,
        isDeleted: false,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        isPinned: true,
        isDeleted: true,
        lastMessageAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');
    }

    const messages = await this.messageRepo.find({
      where: {
        conversationId: params.conversationId,
      },
      order: {
        createdAt: 'ASC',
      },
      select: {
        id: true,
        conversationId: true,
        role: true,
        content: true,
        parentMessageId: true,
        isError: true,
        metadata: true,
        createdAt: true,
      },
    });

    return {
      conversation,
      messages,
    };
  }

  async getOrCreateConversation(params: {
    conversationId?: string;
    userId: string;
    firstQuery?: string;
  }): Promise<AiChatConversation> {
    const { conversationId, userId, firstQuery } = params;

    if (conversationId) {
      const conversation = await this.conversationRepo.findOne({
        where: {
          id: conversationId,
          userId,
          isDeleted: false,
        },
      });

      if (!conversation) {
        throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');
      }

      return conversation;
    }

    const conversation = this.conversationRepo.create({
      userId,
      title: this.generateTitle(firstQuery),
      lastMessageAt: new Date(),
      metadata: null,
    });

    return this.conversationRepo.save(conversation);
  }

  async saveUserMessage(params: {
    conversationId: string;
    content: string;
    metadata?: Record<string, any>;
  }): Promise<AiChatMessage> {
    const message = this.messageRepo.create({
      conversationId: params.conversationId,
      role: AiChatRole.USER,
      content: params.content,
      metadata: params.metadata ?? null,
    });

    const saved = await this.messageRepo.save(message);

    await this.touchConversation(params.conversationId);

    return saved;
  }

  async saveAssistantMessage(params: {
    conversationId: string;
    content: string;
    metadata?: Record<string, any>;
    parentMessageId?: string | null;
    isError?: boolean;
  }): Promise<AiChatMessage> {
    const message = this.messageRepo.create({
      conversationId: params.conversationId,
      role: AiChatRole.ASSISTANT,
      content: params.content,
      parentMessageId: params.parentMessageId ?? null,
      isError: params.isError ?? false,
      metadata: params.metadata ?? null,
    });

    const saved = await this.messageRepo.save(message);

    await this.touchConversation(params.conversationId);

    return saved;
  }

  async getConversationMessages(params: {
    conversationId: string;
    userId: string;
  }) {
    const conversation = await this.conversationRepo.findOne({
      where: {
        id: params.conversationId,
        userId: params.userId,
        isDeleted: false,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');
    }

    return this.messageRepo.find({
      where: {
        conversationId: params.conversationId,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async renameConversation(params: {
    conversationId: string;
    userId: string;
    title: string;
  }) {
    const conversation = await this.conversationRepo.findOne({
      where: {
        id: params.conversationId,
        userId: params.userId,
        isDeleted: false,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');
    }

    await this.conversationRepo.update(
      { id: params.conversationId },
      { title: params.title },
    );

    return {
      success: true,
    };
  }

  async softDeleteConversation(params: {
    conversationId: string;
    userId: string;
  }) {
    const conversation = await this.conversationRepo.findOne({
      where: {
        id: params.conversationId,
        userId: params.userId,
        isDeleted: false,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');
    }

    await this.conversationRepo.update(
      { id: params.conversationId },
      { isDeleted: true },
    );

    return {
      success: true,
    };
  }

  private async touchConversation(conversationId: string) {
    await this.conversationRepo.update(
      { id: conversationId },
      {
        lastMessageAt: new Date(),
      },
    );
  }

  private generateTitle(query?: string): string {
    if (!query) return 'Cuộc trò chuyện mới';

    const normalized = query.trim().replace(/\s+/g, ' ');
    if (!normalized) return 'Cuộc trò chuyện mới';

    return normalized.length > 80
      ? `${normalized.slice(0, 80).trim()}...`
      : normalized;
  }
}