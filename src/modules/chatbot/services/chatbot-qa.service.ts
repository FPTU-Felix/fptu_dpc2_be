import { Injectable } from '@nestjs/common';
import { ChatbotRetrievalService } from './chatbot-retrieval.service';
import {
  QueryRouterService,
  RouteDecision,
  ClarificationType,
} from './query-router.service';
import { PromptDefenseService, UserRole } from './prompt-defense.service';
import { OllamaChatService } from './ollma-chat.service';

type AskParams = {
  query: string;
  topK?: number;
  documentId?: string;
  userId?: string;
  userRole?: UserRole;
};

type RetrievalReason =
  | 'ANSWERED'
  | 'NO_RELEVANT_CONTEXT'
  | 'LOW_CONFIDENCE'
  | 'TOOL_ONLY'
  | 'HYBRID'
  | 'CLARIFICATION_REQUIRED'
  | 'OUT_OF_SCOPE'
  | 'BLOCKED_BY_POLICY';

export type ChatbotQaResponse = {
  query: string;
  normalizedQuery?: string;
  canAnswer: boolean;
  needClarification: boolean;
  outOfScope: boolean;
  blocked: boolean;
  clarificationType?: ClarificationType | 'unknown';
  clarificationQuestion?: string;
  route:
  | RouteDecision
  | {
    mode: 'blocked';
    intent: 'blocked';
    reason: string;
    blockedMessage: string;
  };

  answer: string;

  sources: Array<{
    id: string;
    documentId: string;
    documentTitle: string;
    chunkIndex: number;
    pageNumber?: number | null;
    sectionPath?: string | null;
    score: number;
  }>;

  toolResults?: any[];

  retrieval: {
    topK: number;
    matched: number;
    bestScore: number;
    reason: RetrievalReason;
  };

  metadata?: Record<string, any>;
};

@Injectable()
export class ChatbotQaService {
  private readonly defaultTopK = 10;
  private readonly lowConfidenceThreshold = 0.4;
  private readonly highConfidenceThreshold = 0.52;

  constructor(
    private readonly retrievalService: ChatbotRetrievalService,
    private readonly ollamaChatService: OllamaChatService,
    private readonly queryRouterService: QueryRouterService,
    private readonly promptDefenseService: PromptDefenseService,
  ) { }

  async ask(params: AskParams): Promise<ChatbotQaResponse> {
    const startedAt = Date.now();

    const normalizedQuery = this.normalizeUserQuery(params.query);

    const security = this.promptDefenseService.inspect({
      query: normalizedQuery,
      userId: params.userId,
      userRole: params.userRole,
    });


    if (security.action === 'BLOCK') {
      return this.handleBlocked(
        { ...params, query: normalizedQuery },
        {
          reason: security.reason,
          message:
            security.message ??
            'Yêu cầu này không thể được thực hiện theo chính sách bảo mật của hệ thống.',
        },
        startedAt,
      );
    }

    const effectiveQuery =
      security.action === 'SANITIZE_AND_CONTINUE'
        ? this.normalizeUserQuery(security.sanitizedQuery ?? normalizedQuery)
        : normalizedQuery; ``

    const route = this.queryRouterService.decide(effectiveQuery);

    if (route.mode === 'out_of_scope') {
      return this.handleOutOfScope(params, route, effectiveQuery, startedAt);
    }

    if (route.mode === 'clarify') {
      return this.handleClarify(params, route, effectiveQuery, startedAt);
    }

    return this.handleRagOnly(
      { ...params, query: effectiveQuery },
      route,
      startedAt,
    );
  }

  private normalizeUserQuery(query: string): string {
    if (!query) return '';

    return query
      .normalize('NFC')
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
      .replace(/[?!.。]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
  private async handleBlocked(
    params: AskParams,
    block: {
      reason: string;
      message: string;
    },
    startedAt: number,
  ): Promise<ChatbotQaResponse> {
    return {
      query: params.query,
      normalizedQuery: params.query,
      canAnswer: false,
      needClarification: false,
      outOfScope: false,
      blocked: true,
      route: {
        mode: 'blocked',
        intent: 'blocked',
        reason: block.reason,
        blockedMessage: block.message,
      },
      answer: block.message,
      sources: [],
      retrieval: {
        topK: 0,
        matched: 0,
        bestScore: 0,
        reason: 'BLOCKED_BY_POLICY',
      },
      metadata: {
        latency: Date.now() - startedAt,
        blockedReason: block.reason,
      },
    };
  }

  private async handleOutOfScope(
    params: AskParams,
    route: RouteDecision,
    effectiveQuery: string,
    startedAt: number,
  ): Promise<ChatbotQaResponse> {
    const answer =
      route.outOfScopeMessage ??
      'Câu hỏi này ngoài phạm vi hỗ trợ của chatbot. Tôi chuyên hỗ trợ tra cứu tài liệu, quy trình, cuộc họp và thông tin tổ chức trong hệ thống.';

    return {
      query: params.query,
      normalizedQuery: effectiveQuery,
      canAnswer: false,
      needClarification: false,
      outOfScope: true,
      blocked: false,
      route,
      answer,
      sources: [],
      retrieval: {
        topK: 0,
        matched: 0,
        bestScore: 0,
        reason: 'OUT_OF_SCOPE',
      },
      metadata: {
        latency: Date.now() - startedAt,
      },
    };
  }

  private async handleClarify(
    params: AskParams,
    route: RouteDecision,
    effectiveQuery: string,
    startedAt: number,
  ): Promise<ChatbotQaResponse> {
    const clarificationQuestion =
      route.clarificationQuestion ??
      'Bạn có thể nói rõ hơn câu hỏi được không?';

    return {
      query: params.query,
      normalizedQuery: effectiveQuery,
      canAnswer: false,
      needClarification: true,
      outOfScope: false,
      blocked: false,
      clarificationType:
        route.clarificationType ?? ('unknown' as ClarificationType),
      clarificationQuestion,
      route,
      answer: clarificationQuestion,
      sources: [],
      retrieval: {
        topK: 0,
        matched: 0,
        bestScore: 0,
        reason: 'CLARIFICATION_REQUIRED',
      },
      metadata: {
        latency: Date.now() - startedAt,
      },
    };
  }

  private async handleRagOnly(
    params: AskParams,
    route: RouteDecision,
    startedAt: number,
  ): Promise<ChatbotQaResponse> {
    const topK = params.topK ?? this.defaultTopK;

    const items = await this.retrievalService.retrieve({
      query: params.query,
      topK,
      documentId: params.documentId,
    });

    const bestScore = items.length ? items[0].score : 0;

    if (!items.length || bestScore < this.lowConfidenceThreshold) {
      return this.buildFallbackResponse({
        query: params.query,
        normalizedQuery: params.query,
        topK,
        bestScore,
        reason: 'NO_RELEVANT_CONTEXT',
        answer:
          'Tôi chưa tìm thấy thông tin phù hợp trong kho tài liệu hiện có để trả lời câu hỏi này.',
        route,
        startedAt,
      });
    }

    if (bestScore < this.highConfidenceThreshold) {
      return this.buildFallbackResponse({
        query: params.query,
        normalizedQuery: params.query,
        topK,
        bestScore,
        reason: 'LOW_CONFIDENCE',
        answer:
          'Tôi có tìm thấy một số nội dung gần liên quan, nhưng chưa đủ chắc chắn để trả lời chính xác câu hỏi này.',
        route,
        startedAt,
      });
    }

    const filteredItems = items.filter(
      (item) => item.score >= this.lowConfidenceThreshold,
    );

    if (!filteredItems.length) {
      return this.buildFallbackResponse({
        query: params.query,
        normalizedQuery: params.query,
        topK,
        bestScore,
        reason: 'NO_RELEVANT_CONTEXT',
        answer:
          'Tôi chưa tìm thấy thông tin phù hợp trong kho tài liệu hiện có để trả lời câu hỏi này.',
        route,
        startedAt,
      });
    }

    const completion = await this.ollamaChatService.answerWithRag({
      question: params.query,
      chunks: filteredItems,
    });

    return {
      query: params.query,
      normalizedQuery: params.query,
      canAnswer: true,
      needClarification: false,
      outOfScope: false,
      blocked: false,
      route,
      answer: completion.answer,
      sources: filteredItems.map((item) => ({
        id: item.id,
        documentId: item.documentId,
        documentTitle: item.documentTitle ?? 'Không rõ',
        chunkIndex: item.chunkIndex,
        pageNumber: item.pageNumber,
        sectionPath: item.sectionPath,
        score: item.score,
      })),
      retrieval: {
        topK,
        matched: filteredItems.length,
        bestScore,
        reason: 'ANSWERED',
      },
      metadata: {
        latency: Date.now() - startedAt,
        mode: 'rag',
        rawMatched: items.length,
      },
    };
  }




  private buildFallbackResponse(params: {
    query: string;
    normalizedQuery?: string;
    topK: number;
    bestScore: number;
    reason: RetrievalReason;
    answer: string;
    route: RouteDecision;
    startedAt: number;
  }): ChatbotQaResponse {
    return {
      query: params.query,
      normalizedQuery: params.normalizedQuery,
      canAnswer: false,
      needClarification: false,
      outOfScope: false,
      blocked: false,
      route: params.route,
      answer: params.answer,
      sources: [],
      retrieval: {
        topK: params.topK,
        matched: 0,
        bestScore: params.bestScore,
        reason: params.reason,
      },
      metadata: {
        latency: Date.now() - params.startedAt,
        mode: 'fallback',
      },
    };
  }
}
