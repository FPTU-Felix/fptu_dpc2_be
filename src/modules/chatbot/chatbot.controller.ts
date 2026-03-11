import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RetrieveDocumentDto } from './dto/retrieve-document.dto';
import { ChatbotRetrievalService } from './services/chatbot-retrieval.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChatbotQaService } from './services/chatbot-qa.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotRetrievalService: ChatbotRetrievalService,
        private readonly chatbotQaService: ChatbotQaService,

  ) {}

  @Post('retrieve')
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  async retrieve(@Body() dto: RetrieveDocumentDto) {
    const items = await this.chatbotRetrievalService.retrieve({
      query: dto.query,
      topK: dto.topK,
      documentId: dto.documentId,
      documentVersionId: dto.documentVersionId,
    });

    return {
      query: dto.query,
      topK: dto.topK ?? 5,
      items,
    };
  }

   @Post('ask')
  async ask(@Body() dto: RetrieveDocumentDto) {
    return this.chatbotQaService.ask({
      query: dto.query,
      topK: dto.topK,
      documentId: dto.documentId,
      documentVersionId: dto.documentVersionId,
    });
  }
}
