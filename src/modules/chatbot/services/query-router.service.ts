import { Injectable } from '@nestjs/common';

export type ChatRouteMode =
  | 'rag'
  | 'tool'
  | 'hybrid'
  | 'clarify'
  | 'out_of_scope'
  | 'blocked';

export type ToolName =
  | 'meeting_lookup'
  | 'organization_lookup';

export type ClarificationType =
  | 'meeting_target'
  | 'information_type'
  | 'list_target'
  | 'document_target'
  | 'unknown';

export type RouteDecision = {
  mode: ChatRouteMode;
  intent:
  | 'policy_lookup'
  | 'process_lookup'
  | 'document_lookup'
  | 'meeting_lookup'
  | 'organization_lookup'
  | 'hybrid_lookup'
  | 'clarification'
  | 'out_of_scope'
  | 'blocked'
  | 'unknown';
  tools?: ToolName[];
  reason: string;
  clarificationQuestion?: string;
  clarificationType?: ClarificationType;
  outOfScopeMessage?: string;
  blockedMessage?: string;
};

@Injectable()
export class QueryRouterService {
  decide(query: string): RouteDecision {
    const q = this.normalize(query);

    const outOfScope = this.detectOutOfScope(q);
    if (outOfScope) {
      return outOfScope;
    }

    const hasMeeting = this.hasAny(q, [
      'meeting',
      'họp',
      'sinh hoạt chi bộ',
      'lịch họp',
      'cuộc họp',
      'tham dự',
      'vắng mặt',
      'attendance',
    ]);

    const hasOrganization = this.hasAny(q, [
      'bí thư là ai',
      'phó bí thư là ai',
      'chi bộ có bao nhiêu đảng viên',
      'ban chi ủy',
      'chi bộ trực thuộc',
      'đảng bộ nào',
      'thông tin tổ chức đảng',
      'thông tin chi bộ',
      'thông tin tổ chức',
    ]);

    const hasCeremonyOrOath = this.hasAny(q, [
      'tuyên thệ',
      'lời tuyên thệ',
      'lời thề',
      'lễ kết nạp',
      'kết nạp đảng',
    ]);

    // 🔥 FIX 1: mở rộng policy detection
    const hasPolicy = this.hasAny(q, [
      'quy trình',
      'thủ tục',
      'hồ sơ',
      'giấy tờ',
      'điều kiện',
      'quyền',
      'trách nhiệm',
      'hướng dẫn',
      'mẫu',
      'biểu mẫu',
      'nghị quyết',
      'quy định',

      // ✅ thêm mới
      'mức',
      'bao nhiêu',
      'cách tính',
      'đảng phí',
      'khi về hưu',
      'đóng như thế nào',
      'đối tượng nào',
    ]);

    const looksLikeQuestion = this.looksLikeQuestion(q);

    const needsTool = hasMeeting || hasOrganization;
    const needsRag = hasPolicy || hasCeremonyOrOath || looksLikeQuestion;

    // ưu tiên nghi thức
    if (hasCeremonyOrOath && !needsTool) {
      return {
        mode: 'rag',
        intent: 'document_lookup',
        reason: 'Câu hỏi nghi thức → RAG',
      };
    }

    const clarification = this.detectAmbiguity(q);
    if (clarification) {
      return clarification;
    }

    if (needsTool && needsRag) {
      return {
        mode: 'hybrid',
        intent: 'hybrid_lookup',
        tools: this.pickTools({ hasMeeting, hasOrganization }),
        reason: 'Hybrid query',
      };
    }

    if (needsTool) {
      return {
        mode: 'tool',
        intent: this.pickIntent({ hasMeeting, hasOrganization }),
        tools: this.pickTools({ hasMeeting, hasOrganization }),
        reason: 'Tool query',
      };
    }

    if (needsRag) {
      return {
        mode: 'rag',
        intent: this.pickRagIntent(q),
        reason: 'Fallback → coi là câu hỏi tài liệu',
      };
    }

    // 🔥 FIX 2: fallback luôn về RAG thay vì clarify
    return {
      mode: 'rag',
      intent: 'policy_lookup',
      reason: 'Fallback RAG (tránh hỏi lại)',
    };
  }

  private detectOutOfScope(query: string): RouteDecision | null {
    if (this.isWeatherQuery(query)) {
      return this.buildOutOfScope(
        'Câu hỏi về thời tiết ngoài phạm vi hỗ trợ của chatbot.',
        'Tôi chuyên hỗ trợ tra cứu tài liệu, quy trình, cuộc họp và thông tin tổ chức trong hệ thống.',
      );
    }

    if (this.isCryptoOrPriceQuery(query)) {
      return this.buildOutOfScope(
        'Câu hỏi về giá tài sản/thị trường ngoài phạm vi hỗ trợ.',
        'Tôi không hỗ trợ tra cứu giá thị trường. Tôi chuyên hỗ trợ nghiệp vụ trong hệ thống.',
      );
    }

    if (this.isEssayOrLongWritingQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu viết bài ngoài phạm vi chatbot nghiệp vụ.',
        'Tôi không hỗ trợ viết bài văn hoặc nội dung dài ngoài phạm vi hệ thống. Tôi chuyên hỗ trợ tra cứu nghiệp vụ.',
      );
    }

    if (this.isProgrammingQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu lập trình ngoài phạm vi chatbot nghiệp vụ.',
        'Tôi không hỗ trợ lập trình ngoài phạm vi chatbot nghiệp vụ này.',
      );
    }

    return null;
  }

  private buildOutOfScope(
    reason: string,
    outOfScopeMessage: string,
  ): RouteDecision {
    return {
      mode: 'out_of_scope',
      intent: 'out_of_scope',
      reason,
      outOfScopeMessage,
    };
  }
  private looksLikeQuestion(q: string): boolean {
    return this.hasAny(q, [
      'bao nhiêu',
      'là gì',
      'thế nào',
      'như thế nào',
      'cách',
      'quy định',
      'mức',
      'khi nào',
    ]);
  }
  private detectAmbiguity(query: string): RouteDecision | null {
    if (this.isAmbiguousMeeting(query)) {
      return {
        mode: 'clarify',
        intent: 'clarification',
        reason: 'Người dùng hỏi về meeting nhưng chưa nêu rõ meeting nào.',
        clarificationType: 'meeting_target',
        clarificationQuestion:
          'Bạn muốn xem cuộc họp nào hoặc trong khoảng thời gian nào? Ví dụ: cuộc họp gần nhất, họp tháng này, hay họp ngày 20/06/2026.',
      };
    }

    if (this.isAmbiguousList(query)) {
      return {
        mode: 'clarify',
        intent: 'clarification',
        reason: 'Người dùng yêu cầu xem danh sách nhưng chưa nêu rõ danh sách gì.',
        clarificationType: 'list_target',
        clarificationQuestion:
          'Bạn muốn xem danh sách gì? Ví dụ: danh sách cuộc họp, danh sách tài liệu, hay danh sách tổ chức.',
      };
    }

    if (this.isAmbiguousDocument(query)) {
      return {
        mode: 'clarify',
        intent: 'clarification',
        reason:
          'Người dùng hỏi về văn bản/tài liệu nhưng chưa nêu rõ tài liệu nào.',
        clarificationType: 'document_target',
        clarificationQuestion:
          'Bạn muốn hỏi về văn bản/tài liệu nào? Bạn có thể cho tôi tên tài liệu hoặc nội dung cụ thể cần tra cứu.',
      };
    }

    return null;
  }

  private isAmbiguousMeeting(query: string): boolean {
    const shortMeetingPatterns = [
      'cho tôi xem meeting',
      'xem meeting',
      'meeting',
      'xem họp',
      'cho tôi xem họp',
      'xem cuộc họp',
      'cho tôi xem cuộc họp',
      'xem lịch họp',
      'cho tôi xem lịch họp',
    ];

    const mentionsMeeting = this.hasAny(query, [
      'meeting',
      'họp',
      'cuộc họp',
      'lịch họp',
      'sinh hoạt chi bộ',
    ]);

    const hasSpecificDate = this.hasDate(query);
    const hasTimeRef = this.hasAny(query, [
      'hôm nay',
      'tuần này',
      'tháng này',
      'gần nhất',
      'sắp tới',
      'tiếp theo',
      'ngày mai',
      'hôm qua',
    ]);

    if (shortMeetingPatterns.includes(query)) {
      return true;
    }

    return (
      mentionsMeeting &&
      !hasSpecificDate &&
      !hasTimeRef &&
      query.split(' ').length <= 6
    );
  }

  private isAmbiguousList(query: string): boolean {
    const exactPatterns = [
      'tôi muốn xem danh sách',
      'xem danh sách',
      'cho tôi xem danh sách',
      'danh sách',
    ];

    return exactPatterns.includes(query);
  }

  private isAmbiguousDocument(query: string): boolean {
    // Nếu đã có tín hiệu mạnh về tuyên thệ/kết nạp Đảng thì không coi là ambiguous nữa
    if (
      this.hasAny(query, [
        'tuyên thệ',
        'lời tuyên thệ',
        'lời thề',
        'lễ kết nạp',
        'kết nạp đảng',
      ])
    ) {
      return false;
    }

    const docKeywords = [
      'quyết định',
      'nghị quyết',
      'văn bản',
      'thông báo',
      'quy định',
      'hướng dẫn',
      'biểu mẫu',
      'mẫu đơn',
      'mẫu',
    ];

    const vaguePrefixes = [
      'tôi muốn hỏi về',
      'tôi muốn xem',
      'tôi muốn biết về',
      'cho tôi xem',
      'cho tôi hỏi về',
      'xem',
      'hỏi về',
      'biết về',
    ];

    const hasDocKeyword = this.hasAny(query, docKeywords);
    if (!hasDocKeyword) return false;

    const hasSpecificSignals =
      this.hasDate(query) ||
      query.split(' ').length >= 7;

    const isVeryShortDocQuery =
      docKeywords.includes(query) ||
      vaguePrefixes.some((prefix) =>
        docKeywords.some((kw) => query === `${prefix} ${kw}`),
      );

    return isVeryShortDocQuery || !hasSpecificSignals;
  }

  private isWeatherQuery(query: string): boolean {
    return this.hasAny(query, [
      'thời tiết',
      'nhiệt độ',
      'trời mưa',
      'dự báo thời tiết',
    ]);
  }

  private isCryptoOrPriceQuery(query: string): boolean {
    return this.hasAny(query, [
      'bitcoin',
      'btc',
      'eth',
      'giá vàng',
      'giá đô',
      'giá usd',
      'coin',
      'crypto',
      'chứng khoán',
      'giá hôm nay bao nhiêu',
    ]);
  }

  private isEssayOrLongWritingQuery(query: string): boolean {
    return this.hasAny(query, [
      'viết cho tôi một bài văn',
      'viết bài văn',
      'viết bài luận',
      'viết cho tôi bài',
      'bài văn 1000 chữ',
      'viết đoạn văn',
    ]);
  }

  private isProgrammingQuery(query: string): boolean {
    return this.hasAny(query, [
      'lập trình cho tôi',
      'viết code',
      'tạo website',
      'làm website',
      'web bán hàng',
      'viết ứng dụng',
      'code cho tôi',
    ]);
  }

  private hasDate(text: string): boolean {
    return (
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(text) ||
      /\b\d{4}-\d{2}-\d{2}\b/.test(text) ||
      /\bngày\s+\d{1,2}(\/\d{1,2}(\/\d{4})?)?\b/.test(text)
    );
  }

  private normalize(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private hasAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }

  private pickTools(flags: {
    hasMeeting: boolean;
    hasOrganization: boolean;
  }): ToolName[] {
    const tools: ToolName[] = [];

    if (flags.hasMeeting) tools.push('meeting_lookup');
    if (flags.hasOrganization) tools.push('organization_lookup');

    if (!tools.length) {
      tools.push('organization_lookup');
    }

    return tools;
  }

  private pickIntent(flags: {
    hasMeeting: boolean;
    hasOrganization: boolean;
  }): RouteDecision['intent'] {
    if (flags.hasMeeting) return 'meeting_lookup';
    if (flags.hasOrganization) return 'organization_lookup';
    return 'unknown';
  }

  private pickRagIntent(query: string): RouteDecision['intent'] {
    if (
      query.includes('tuyên thệ') ||
      query.includes('lời tuyên thệ') ||
      query.includes('lời thề') ||
      query.includes('lễ kết nạp') ||
      query.includes('kết nạp đảng')
    ) {
      return 'document_lookup';
    }

    if (query.includes('quy trình') || query.includes('thủ tục')) {
      return 'process_lookup';
    }

    if (
      query.includes('hồ sơ') ||
      query.includes('giấy tờ') ||
      query.includes('mẫu') ||
      query.includes('quyết định') ||
      query.includes('nghị quyết') ||
      query.includes('văn bản') ||
      query.includes('thông báo')
    ) {
      return 'document_lookup';
    }

    return 'policy_lookup';
  }
}