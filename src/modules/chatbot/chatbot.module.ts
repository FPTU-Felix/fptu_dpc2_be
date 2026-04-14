import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotController } from './chatbot.controller';
import { ChatbotQaService } from './services/chatbot-qa.service';
import { ChatbotRetrievalService } from './services/chatbot-retrieval.service';
import { QueryRouterService } from './services/query-router.service';
import { ChatbotToolService } from './services/chatbot-tool.service';
import { DocumentChunkEntity } from '../upload-documents/entities/document-chunk.entity';

import { EmbeddingService } from '../embedding/services/embedding.service';
import { PromptDefenseService } from './services/prompt-defense.service';
import { OllamaChatService } from './services/ollma-chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentChunkEntity,
    ]),
  ],
  controllers: [ChatbotController],
  providers: [
    ChatbotQaService,
    ChatbotRetrievalService,
    OllamaChatService,
    QueryRouterService,
    ChatbotToolService,
    EmbeddingService,
    PromptDefenseService
  ],
  exports: [ChatbotQaService],
})
export class ChatbotModule { }