import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { RetrieveDocumentDto } from './dto/retrieve-document.dto';
import { AskChatbotDto } from './dto/ask-chatbot.dto';
import { ChatbotRetrievalService } from './services/chatbot-retrieval.service';
import { ChatbotQaService } from './services/chatbot-qa.service';
import { ChatbotHistoryService } from './services/chatbot-history.service';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller('chatbot')
@UseGuards(AuthGuard('jwt'))
export class ChatbotController {
  constructor(
    private readonly chatbotRetrievalService: ChatbotRetrievalService,
    private readonly chatbotQaService: ChatbotQaService,
    private readonly chatbotHistoryService: ChatbotHistoryService,
  ) {}

  @Post('retrieve')
  async retrieve(@Body() dto: RetrieveDocumentDto) {
    const items = await this.chatbotRetrievalService.retrieve({
      query: dto.query,
      topK: dto.topK,
      documentId: dto.documentId,
    });

    return {
      query: dto.query,
      topK: dto.topK ?? 5,
      items,
    };
  }

  @Post('ask')
  async ask(
    @Body() dto: AskChatbotDto,
    @GetCurrentUser('sub') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Người dùng chưa đăng nhập.');
    }

    let conversation;

    try {
      conversation = await this.chatbotHistoryService.getOrCreateConversation({
        conversationId: dto.conversationId,
        userId,
        firstQuery: dto.query,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        conversation = await this.chatbotHistoryService.getOrCreateConversation({
          conversationId: undefined,
          userId,
          firstQuery: dto.query,
        });
      } else {
        throw error;
      }
    }

    const userMessage = await this.chatbotHistoryService.saveUserMessage({
      conversationId: conversation.id,
      content: dto.query,
      metadata: {
        source: 'chatbot.ask',
        originalConversationId: dto.conversationId ?? null,
      },
    });

    try {
      const qaResult = await this.chatbotQaService.ask({
        query: dto.query,
      });

      const assistantMessage =
        await this.chatbotHistoryService.saveAssistantMessage({
          conversationId: conversation.id,
          content: qaResult.answer,
          parentMessageId: userMessage.id,
          metadata: {
            source: 'chatbot.ask',
            qaResult,
          },
        });

      return {
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        recoveredConversation:
          !!dto.conversationId && dto.conversationId !== conversation.id,
        ...qaResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Có lỗi xảy ra khi hỏi chatbot.';

      await this.chatbotHistoryService.saveAssistantMessage({
        conversationId: conversation.id,
        content: errorMessage,
        parentMessageId: userMessage.id,
        isError: true,
        metadata: {
          source: 'chatbot.ask',
          error: true,
          message: errorMessage,
        },
      });

      throw error;
    }
  }

  @Get('conversations')
  async getConversations(@GetCurrentUser('sub') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Người dùng chưa đăng nhập.');
    }

    const items = await this.chatbotHistoryService.getUserConversations(userId);

    return {
      items,
    };
  }

  @Get('messages/:conversationId')
  async getMessages(
    @Param('conversationId') conversationId: string,
    @GetCurrentUser('sub') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Người dùng chưa đăng nhập.');
    }

    const { conversation, messages } =
      await this.chatbotHistoryService.getConversationDetail({
        conversationId,
        userId,
      });

    return {
      conversationId: conversation.id,
      conversation,
      items: messages,
    };
  }
}