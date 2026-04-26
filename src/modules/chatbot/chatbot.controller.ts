import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RetrieveDocumentDto } from './dto/retrieve-document.dto';
import { AskChatbotDto } from './dto/ask-chatbot.dto';
import { ChatbotRetrievalService } from './services/chatbot-retrieval.service';
import { ChatbotQaService } from './services/chatbot-qa.service';
import { ChatbotHistoryService } from './services/chatbot-history.service';
import { GetCurrentUser } from '../auth/decorators/get-user.decorator';

@Controller('chatbot')
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
    const conversation =
      await this.chatbotHistoryService.getOrCreateConversation({
        conversationId: dto.conversationId,
        userId,
        firstQuery: dto.query,
      });

    const userMessage = await this.chatbotHistoryService.saveUserMessage({
      conversationId: conversation.id,
      content: dto.query,
      metadata: {
        source: 'chatbot.ask',
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
        ...qaResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi hỏi chatbot.';

      await this.chatbotHistoryService.saveAssistantMessage({
        conversationId: conversation.id,
        content: errorMessage,
        parentMessageId: userMessage.id,
        isError: true,
        metadata: {
          source: 'chatbot.ask',
          error: true,
        },
      });

      throw error;
    }
  }

  @Get('conversations')
  async getConversations(@GetCurrentUser('sub') userId: string) {
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