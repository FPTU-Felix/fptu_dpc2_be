import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotController } from './chatbot.controller';
import { ChatbotQaService } from './services/chatbot-qa.service';
import { ChatbotRetrievalService } from './services/chatbot-retrieval.service';
import { OpenAiChatService } from './services/openai-chat.service';
import { QueryRouterService } from './services/query-router.service';
import { ChatbotToolService } from './services/chatbot-tool.service';
import { DocumentChunkEntity } from '../upload-documents/entities/document-chunk.entity';
import { DocumentVersionEntity } from '../upload-documents/entities/document-version.entity';
import { DocumentEntity } from '../upload-documents/entities/document.entity';
import { EmbeddingService } from '../embedding/services/embedding.service';
import { PromptDefenseService } from './services/prompt-defense.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentChunkEntity,
      DocumentVersionEntity,
      DocumentEntity,
    ]),
  ],
  controllers: [ChatbotController],
  providers: [
    ChatbotQaService,
    ChatbotRetrievalService,
    OpenAiChatService,
    QueryRouterService,
    ChatbotToolService,
    EmbeddingService,
    PromptDefenseService
  ],
  exports: [ChatbotQaService],
})
export class ChatbotModule {}