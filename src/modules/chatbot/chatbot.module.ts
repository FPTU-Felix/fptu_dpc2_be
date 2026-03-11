import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotRetrievalService } from './services/chatbot-retrieval.service';
import { EmbeddingModule } from '@/modules/embedding/embedding.module';
import { ChatbotQaService } from './services/chatbot-qa.service';
import { OpenAiChatService } from './services/openai-chat.service';

@Module({
  imports: [EmbeddingModule],
  controllers: [ChatbotController],
  providers: [ChatbotRetrievalService,ChatbotQaService, OpenAiChatService],
})
export class ChatbotModule {}