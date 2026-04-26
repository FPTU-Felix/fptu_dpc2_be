import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotController } from './chatbot.controller';
import { ChatbotQaService } from './services/chatbot-qa.service';
import { ChatbotRetrievalService } from './services/chatbot-retrieval.service';
import { QueryRouterService } from './services/query-router.service';
import { DocumentChunkEntity } from '../upload-documents/entities/document-chunk.entity';

import { EmbeddingService } from '../embedding/services/embedding.service';
import { PromptDefenseService } from './services/prompt-defense.service';
import { OllamaChatService } from './services/ollma-chat.service';
import { ChatbotHistoryService } from './services/chatbot-history.service';
import { AiChatConversation } from './entities/ai-chat-conversation.entity';
import { AiChatMessage } from './entities/ai-chat-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentChunkEntity,
      AiChatConversation,
      AiChatMessage,
    ]),
  ],
  controllers: [ChatbotController],
  providers: [
    ChatbotQaService,
    ChatbotRetrievalService,
    OllamaChatService,
    QueryRouterService,
    EmbeddingService,
    PromptDefenseService,
    ChatbotHistoryService,
  ],
  exports: [ChatbotQaService],
})
export class ChatbotModule {}
