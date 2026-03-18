import { Injectable } from '@nestjs/common';
import { ChatbotRetrievalService } from './chatbot-retrieval.service';
import { OpenAiChatService } from './openai-chat.service';
import {
  QueryRouterService,
  RouteDecision,
} from './query-router.service';
import { ChatbotToolService } from './chatbot-tool.service';

type AskParams = {
  query: string;
  topK?: number;
  documentId?: string;
  documentVersionId?: string;
  userId?: string;
};

type RetrievalReason =
  | 'ANSWERED'
  | 'NO_RELEVANT_CONTEXT'
  | 'LOW_CONFIDENCE'
  | 'TOOL_ONLY'
  | 'HYBRID';

@Injectable()
export class ChatbotQaService {
  private readonly defaultTopK = 5;
  private readonly lowConfidenceThreshold = 0.4;
  private readonly highConfidenceThreshold = 0.52;

  constructor(
    private readonly retrievalService: ChatbotRetrievalService,
    private readonly openAiChatService: OpenAiChatService,
    private readonly queryRouterService: QueryRouterService,
    private readonly chatbotToolService: ChatbotToolService,
  ) {}

  async ask(params: AskParams) {
    const topK = params.topK ?? this.defaultTopK;
    const route = this.queryRouterService.decide(params.query);

    if (route.mode === 'tool') {
      return this.handleToolOnly(params, route);
    }

    if (route.mode === 'hybrid') {
      return this.handleHybrid(params, route);
    }

    return this.handleRagOnly(params, route);
  }

  private async handleRagOnly(params: AskParams, route: RouteDecision) {
    const topK = params.topK ?? this.defaultTopK;

    const items = await this.retrievalService.retrieve({
      query: params.query,
      topK,
      documentId: params.documentId,
      documentVersionId: params.documentVersionId,
    });

    const bestScore = items.length ? items[0].score : 0;

    if (!items.length || bestScore < this.lowConfidenceThreshold) {
      return this.buildFallbackResponse({
        query: params.query,
        topK,
        bestScore,
        reason: 'NO_RELEVANT_CONTEXT',
        answer:
          'Tôi chưa tìm thấy thông tin phù hợp trong kho tài liệu hiện có để trả lời câu hỏi này.',
        route,
      });
    }

    if (bestScore < this.highConfidenceThreshold) {
      return this.buildFallbackResponse({
        query: params.query,
        topK,
        bestScore,
        reason: 'LOW_CONFIDENCE',
        answer:
          'Tôi có tìm thấy một số nội dung gần liên quan, nhưng chưa đủ chắc chắn để trả lời chính xác câu hỏi này.',
        route,
      });
    }

    const filteredItems = items.filter(
      (item) => item.score >= this.lowConfidenceThreshold,
    );

    if (!filteredItems.length) {
      return this.buildFallbackResponse({
        query: params.query,
        topK,
        bestScore,
        reason: 'NO_RELEVANT_CONTEXT',
        answer:
          'Tôi chưa tìm thấy thông tin phù hợp trong kho tài liệu hiện có để trả lời câu hỏi này.',
        route,
      });
    }

    const completion = await this.openAiChatService.answerWithRag({
      question: params.query,
      chunks: filteredItems,
    });

    return {
      query: params.query,
      canAnswer: true,
      route,
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

  private async handleToolOnly(params: AskParams, route: RouteDecision) {
    const toolResults = await this.chatbotToolService.executeTools({
      query: params.query,
      tools: route.tools ?? [],
      userId: params.userId,
    });

    const completion = await this.openAiChatService.answerWithTools({
      question: params.query,
      toolResults,
    });

    return {
      query: params.query,
      canAnswer: true,
      route,
      answer: completion.answer,
      sources: [],
      toolResults,
      retrieval: {
        topK: 0,
        matched: 0,
        bestScore: 0,
        reason: 'TOOL_ONLY' as RetrievalReason,
      },
    };
  }

  private async handleHybrid(params: AskParams, route: RouteDecision) {
    const topK = params.topK ?? this.defaultTopK;

    const [items, toolResults] = await Promise.all([
      this.retrievalService.retrieve({
        query: params.query,
        topK,
        documentId: params.documentId,
        documentVersionId: params.documentVersionId,
      }),
      this.chatbotToolService.executeTools({
        query: params.query,
        tools: route.tools ?? [],
        userId: params.userId,
      }),
    ]);

    const bestScore = items.length ? items[0].score : 0;
    const filteredItems = items.filter(
      (item) => item.score >= this.lowConfidenceThreshold,
    );

    const completion = await this.openAiChatService.answerWithHybrid({
      question: params.query,
      chunks: filteredItems,
      toolResults,
    });

    return {
      query: params.query,
      canAnswer: true,
      route,
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
      toolResults,
      retrieval: {
        topK,
        matched: filteredItems.length,
        bestScore,
        reason: 'HYBRID' as RetrievalReason,
      },
    };
  }

  private buildFallbackResponse(params: {
    query: string;
    topK: number;
    bestScore: number;
    reason: RetrievalReason;
    answer: string;
    route: RouteDecision;
  }) {
    return {
      query: params.query,
      canAnswer: false,
      route: params.route,
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