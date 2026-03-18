import { Injectable } from '@nestjs/common';
import { ChatbotRetrievalService } from './chatbot-retrieval.service';
import { OpenAiChatService } from './openai-chat.service';
import {
  QueryRouterService,
  RouteDecision,
  ClarificationType,
} from './query-router.service';
import { ChatbotToolService } from './chatbot-tool.service';
import {
  PromptDefenseService,
  UserRole,
} from './prompt-defense.service';

type AskParams = {
  query: string;
  topK?: number;
  documentId?: string;
  documentVersionId?: string;
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
    private readonly promptDefenseService: PromptDefenseService,
  ) {}

  async ask(params: AskParams) {
    const security = this.promptDefenseService.inspect({
      query: params.query,
      userId: params.userId,
      userRole: params.userRole,
    });

    if (security.action === 'BLOCK') {
      return this.handleBlocked(params, {
        reason: security.reason,
        message:
          security.message ??
          'Yêu cầu này không thể được thực hiện theo chính sách bảo mật của hệ thống.',
      });
    }

    const effectiveQuery =
      security.action === 'SANITIZE_AND_CONTINUE'
        ? security.sanitizedQuery ?? params.query
        : params.query;

    const route = this.queryRouterService.decide(effectiveQuery);

    if (route.mode === 'out_of_scope') {
      return this.handleOutOfScope(params, route, effectiveQuery);
    }

    if (route.mode === 'clarify') {
      return this.handleClarify(params, route, effectiveQuery);
    }

    if (route.mode === 'tool') {
      return this.handleToolOnly(
        { ...params, query: effectiveQuery },
        route,
      );
    }

    if (route.mode === 'hybrid') {
      return this.handleHybrid(
        { ...params, query: effectiveQuery },
        route,
      );
    }

    return this.handleRagOnly(
      { ...params, query: effectiveQuery },
      route,
    );
  }

  private async handleBlocked(
    params: AskParams,
    block: {
      reason: string;
      message: string;
    },
  ) {
    return {
      query: params.query,
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
        reason: 'BLOCKED_BY_POLICY' as RetrievalReason,
      },
    };
  }

  private async handleOutOfScope(
    params: AskParams,
    route: RouteDecision,
    effectiveQuery: string,
  ) {
    return {
      query: params.query,
      normalizedQuery: effectiveQuery,
      canAnswer: false,
      needClarification: false,
      outOfScope: true,
      blocked: false,
      route,
      answer:
        route.outOfScopeMessage ??
        'Câu hỏi này ngoài phạm vi hỗ trợ của chatbot. Tôi chuyên hỗ trợ tra cứu nghiệp vụ Đảng viên trong hệ thống.',
      sources: [],
      retrieval: {
        topK: 0,
        matched: 0,
        bestScore: 0,
        reason: 'OUT_OF_SCOPE' as RetrievalReason,
      },
    };
  }

  private async handleClarify(
    params: AskParams,
    route: RouteDecision,
    effectiveQuery: string,
  ) {
    return {
      query: params.query,
      normalizedQuery: effectiveQuery,
      canAnswer: false,
      needClarification: true,
      blocked: false,
      clarificationType:
        route.clarificationType ?? ('unknown' as ClarificationType),
      clarificationQuestion:
        route.clarificationQuestion ??
        'Bạn có thể nói rõ hơn câu hỏi được không?',
      route,
      answer:
        route.clarificationQuestion ??
        'Bạn có thể nói rõ hơn câu hỏi được không?',
      sources: [],
      retrieval: {
        topK: 0,
        matched: 0,
        bestScore: 0,
        reason: 'CLARIFICATION_REQUIRED' as RetrievalReason,
      },
    };
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
      needClarification: false,
      outOfScope: false,
      blocked: false,
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
      userRole: params.userRole,
    });

    const completion = await this.openAiChatService.answerWithTools({
      question: params.query,
      toolResults,
    });

    return {
      query: params.query,
      canAnswer: true,
      needClarification: false,
      outOfScope: false,
      blocked: false,
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
        userRole: params.userRole,
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
      needClarification: false,
      outOfScope: false,
      blocked: false,
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
    };
  }
}