import { Injectable } from '@nestjs/common';
import { ChatbotRetrievalService } from './chatbot-retrieval.service';
import { OpenAiChatService } from './openai-chat.service';

type AskParams = {
  query: string;
  topK?: number;
  documentId?: string;
  documentVersionId?: string;
};

type RetrievalReason = 'ANSWERED' | 'NO_RELEVANT_CONTEXT' | 'LOW_CONFIDENCE';

@Injectable()
export class ChatbotQaService {
  private readonly defaultTopK = 5;

  private readonly lowConfidenceThreshold = 0.4;
  private readonly highConfidenceThreshold = 0.52;

  constructor(
    private readonly retrievalService: ChatbotRetrievalService,
    private readonly openAiChatService: OpenAiChatService,
  ) {}

  async ask(params: AskParams) {
    const topK = params.topK ?? this.defaultTopK;

    const items = await this.retrievalService.retrieve({
      query: params.query,
      topK,
      documentId: params.documentId,
      documentVersionId: params.documentVersionId,
    });

    const bestScore = items.length ? items[0].score : 0;

    // Không có kết quả đủ liên quan
    if (!items.length || bestScore < this.lowConfidenceThreshold) {
      return this.buildFallbackResponse({
        query: params.query,
        topK,
        bestScore,
        reason: 'NO_RELEVANT_CONTEXT',
        answer:
          'Tôi chưa tìm thấy thông tin phù hợp trong kho tài liệu hiện có để trả lời câu hỏi này.',
      });
    }

    // Có chút liên quan nhưng chưa đủ chắc để trả lời
    if (bestScore < this.highConfidenceThreshold) {
      return this.buildFallbackResponse({
        query: params.query,
        topK,
        bestScore,
        reason: 'LOW_CONFIDENCE',
        answer:
          'Tôi có tìm thấy một số nội dung gần liên quan, nhưng chưa đủ chắc chắn để trả lời chính xác câu hỏi này.',
      });
    }

    // Chỉ giữ các chunk đủ tốt để giảm nhiễu context
    const filteredItems = items.filter(
      (item) => item.score >= this.lowConfidenceThreshold,
    );

    // Có bestScore cao nhưng sau lọc lại rỗng thì vẫn fallback
    if (!filteredItems.length) {
      return this.buildFallbackResponse({
        query: params.query,
        topK,
        bestScore,
        reason: 'NO_RELEVANT_CONTEXT',
        answer:
          'Tôi chưa tìm thấy thông tin phù hợp trong kho tài liệu hiện có để trả lời câu hỏi này.',
      });
    }

    const completion = await this.openAiChatService.answerQuestion({
      question: params.query,
      chunks: filteredItems,
    });

    return {
      query: params.query,
      canAnswer: true,
      answer: completion.answer,
      sources: filteredItems.map((item) => ({
        id: item.id,
        documentId: item.documentId,
        documentVersionId: item.documentVersionId,
        documentTitle: item.documentTitle,
        chunkIndex: item.chunkIndex,
        pageNumber: item.pageNumber,
        sectionPath: item.sectionPath,
        score: item.score,
      })),
      retrieval: {
        topK,
        matched: filteredItems.length,
        bestScore,
        reason: 'ANSWERED' as RetrievalReason,
      },
    };
  }

  private buildFallbackResponse(params: {
    query: string;
    topK: number;
    bestScore: number;
    reason: RetrievalReason;
    answer: string;
  }) {
    return {
      query: params.query,
      canAnswer: false,
      answer: params.answer,
      sources: [],
      retrieval: {
        topK: params.topK,
        matched: 0,
        bestScore: params.bestScore,
        reason: params.reason,
      },
    };
  }
}
