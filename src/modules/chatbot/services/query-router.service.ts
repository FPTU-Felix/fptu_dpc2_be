import { Injectable } from '@nestjs/common';

export type ChatRouteMode =
  | 'rag'
  | 'tool'
  | 'hybrid'
  | 'clarify'
  | 'out_of_scope'
  | 'blocked';

export type ToolName = 'meeting_lookup' | 'organization_lookup';

export type ClarificationType =
  | 'meeting_target'
  | 'information_type'
  | 'list_target'
  | 'document_target'
  | 'ambiguous_reference'
  | 'missing_context'
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

    if (!q) {
      return this.buildClarify(
        'missing_context',
        'Người dùng chưa nhập câu hỏi.',
        'Câu hỏi của bạn đang trống. Vui lòng nhập nội dung cần tra cứu.',
      );
    }

    const outOfScope = this.detectOutOfScope(q);
    if (outOfScope) return outOfScope;

    const ambiguity = this.detectAmbiguity(q);
    if (ambiguity) return ambiguity;

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

    const hasRagSignal = this.hasRagSignal(q);
    const looksLikeQuestion = this.looksLikeQuestion(q);

    const needsTool = hasMeeting || hasOrganization;
    const needsRag = hasRagSignal || looksLikeQuestion;

    if (needsTool && needsRag) {
      return {
        mode: 'hybrid',
        intent: 'hybrid_lookup',
        tools: this.pickTools({ hasMeeting, hasOrganization }),
        reason: 'Câu hỏi cần kết hợp dữ liệu nghiệp vụ và tài liệu RAG.',
      };
    }

    if (needsTool) {
      return {
        mode: 'tool',
        intent: this.pickIntent({ hasMeeting, hasOrganization }),
        tools: this.pickTools({ hasMeeting, hasOrganization }),
        reason: 'Câu hỏi cần tra cứu dữ liệu nghiệp vụ bằng tool.',
      };
    }

    if (needsRag) {
      return {
        mode: 'rag',
        intent: this.pickRagIntent(q),
        reason: 'Câu hỏi phù hợp để tra cứu tài liệu bằng RAG.',
      };
    }

    return {
      mode: 'rag',
      intent: 'policy_lookup',
      reason: 'Fallback về RAG để tránh từ chối nhầm câu hỏi nghiệp vụ.',
    };
  }

  private detectOutOfScope(query: string): RouteDecision | null {
    if (this.isWeatherQuery(query)) {
      return this.buildOutOfScope('Câu hỏi về thời tiết ngoài phạm vi hỗ trợ.');
    }

    if (this.isMarketQuery(query)) {
      return this.buildOutOfScope(
        'Câu hỏi về chứng khoán, giá tài sản hoặc thị trường ngoài phạm vi hỗ trợ.',
      );
    }

    if (this.isMathQuery(query)) {
      return this.buildOutOfScope('Câu hỏi toán học ngoài phạm vi hỗ trợ.');
    }

    if (this.isEntertainmentQuery(query)) {
      return this.buildOutOfScope(
        'Câu hỏi giải trí, phim ảnh ngoài phạm vi hỗ trợ.',
      );
    }

    if (this.isShoppingQuery(query)) {
      return this.buildOutOfScope(
        'Câu hỏi mua sắm hoặc tư vấn thiết bị ngoài phạm vi hỗ trợ.',
      );
    }

    if (this.isEssayOrLongWritingQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu viết bài ngoài phạm vi chatbot nghiệp vụ.',
      );
    }

    if (this.isProgrammingQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu lập trình ngoài phạm vi chatbot nghiệp vụ.',
      );
    }

    return null;
  }

  private detectAmbiguity(query: string): RouteDecision | null {
    if (this.isAmbiguousReference(query)) {
      return this.buildClarify(
        'ambiguous_reference',
        'Câu hỏi dùng tham chiếu mơ hồ nhưng chưa có ngữ cảnh cụ thể.',
        'Câu hỏi của bạn chưa đủ thông tin để xác định chính xác nội dung cần tra cứu. Vui lòng nêu rõ quy định, điều khoản, văn bản hoặc tình huống cụ thể.',
      );
    }

    if (this.isAmbiguousMeeting(query)) {
      return this.buildClarify(
        'meeting_target',
        'Người dùng hỏi về cuộc họp nhưng chưa nêu rõ cuộc họp hoặc thời gian.',
        'Bạn muốn xem cuộc họp nào hoặc trong khoảng thời gian nào? Ví dụ: cuộc họp gần nhất, họp tháng này, hoặc họp ngày 20/06/2026.',
      );
    }

    if (this.isAmbiguousList(query)) {
      return this.buildClarify(
        'list_target',
        'Người dùng yêu cầu xem danh sách nhưng chưa nêu rõ danh sách gì.',
        'Bạn muốn xem danh sách gì? Ví dụ: danh sách cuộc họp, danh sách tài liệu, hay danh sách tổ chức.',
      );
    }

    if (this.isAmbiguousDocument(query)) {
      return this.buildClarify(
        'document_target',
        'Người dùng hỏi về văn bản/tài liệu nhưng chưa nêu rõ tài liệu nào.',
        'Bạn muốn hỏi về văn bản/tài liệu nào? Bạn có thể cho tôi tên tài liệu hoặc nội dung cụ thể cần tra cứu.',
      );
    }

    return null;
  }

  private buildOutOfScope(reason: string): RouteDecision {
    return {
      mode: 'out_of_scope',
      intent: 'out_of_scope',
      reason,
      outOfScopeMessage:
        'Câu hỏi này nằm ngoài phạm vi hỗ trợ của hệ thống. Hệ thống hiện chỉ hỗ trợ tra cứu quy định, Điều lệ Đảng, kỷ luật Đảng viên, công tác tổ chức, quản lý Đảng viên, tài liệu nội bộ, cuộc họp và thông tin tổ chức Đảng.',
    };
  }

  private buildClarify(
    clarificationType: ClarificationType,
    reason: string,
    clarificationQuestion: string,
  ): RouteDecision {
    return {
      mode: 'clarify',
      intent: 'clarification',
      reason,
      clarificationType,
      clarificationQuestion,
    };
  }

  private hasRagSignal(q: string): boolean {
    return this.hasAny(q, [
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
      'điều lệ',
      'kỷ luật',
      'khai trừ',
      'khiển trách',
      'cảnh cáo',
      'đảng phí',
      'bảo hiểm xã hội',
      'bhxh',
      'tuyên thệ',
      'lời tuyên thệ',
      'lời thề',
      'lễ kết nạp',
      'kết nạp đảng',
      'mức đóng',
      'cách tính',
      'áp dụng',
      'thi hành',
      'kiểm tra',
    ]);
  }

  private looksLikeQuestion(q: string): boolean {
    return this.hasAny(q, [
      'bao nhiêu',
      'là gì',
      'thế nào',
      'như thế nào',
      'cách',
      'khi nào',
      'ở đâu',
      'ai',
      'vì sao',
      'tại sao',
      'có được không',
      'có phải không',
    ]);
  }

  private isAmbiguousReference(query: string): boolean {
    return this.hasAny(query, [
      'trường hợp này',
      'quy định này',
      'điều này',
      'nội dung này',
      'việc này',
      'mức này',
      'hình thức này',
      'trường hợp đặc biệt',
      'áp dụng rộng rãi đến mức nào',
      'điều lệ có thể linh hoạt không',
    ]);
  }

  private isAmbiguousMeeting(query: string): boolean {
    const exactPatterns = [
      'meeting',
      'họp',
      'cuộc họp',
      'lịch họp',
      'xem meeting',
      'cho tôi xem meeting',
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

    const hasSpecificTime =
      this.hasDate(query) ||
      this.hasAny(query, [
        'hôm nay',
        'tuần này',
        'tháng này',
        'năm nay',
        'gần nhất',
        'sắp tới',
        'tiếp theo',
        'ngày mai',
        'hôm qua',
      ]);

    if (exactPatterns.includes(query)) return true;

    return mentionsMeeting && !hasSpecificTime && query.split(' ').length <= 6;
  }

  private isAmbiguousList(query: string): boolean {
    return [
      'tôi muốn xem danh sách',
      'xem danh sách',
      'cho tôi xem danh sách',
      'danh sách',
    ].includes(query);
  }

  private isAmbiguousDocument(query: string): boolean {
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

    const isVeryShortDocQuery =
      docKeywords.includes(query) ||
      vaguePrefixes.some((prefix) =>
        docKeywords.some((kw) => query === `${prefix} ${kw}`),
      );

    return isVeryShortDocQuery;
  }

  private isWeatherQuery(query: string): boolean {
    return this.hasAny(query, [
      'thời tiết',
      'nhiệt độ',
      'trời mưa',
      'dự báo thời tiết',
    ]);
  }

  private isMarketQuery(query: string): boolean {
    return this.hasAny(query, [
      'vn-index',
      'chứng khoán',
      'cổ phiếu',
      'giá vàng',
      'giá đô',
      'giá usd',
      'bitcoin',
      'btc',
      'eth',
      'coin',
      'crypto',
    ]);
  }

  private isMathQuery(query: string): boolean {
    return this.hasAny(query, [
      'đạo hàm',
      'tích phân',
      'công thức toán',
      'công thức toán học',
      'phương trình',
      'lượng giác',
    ]);
  }

  private isEntertainmentQuery(query: string): boolean {
    return this.hasAny(query, [
      'netflix',
      'phim hay',
      'phim gì hay',
      'xem phim',
      'diễn viên',
      'ca sĩ',
    ]);
  }

  private isShoppingQuery(query: string): boolean {
    return this.hasAny(query, [
      'laptop gaming',
      'laptop tốt nhất',
      'mua laptop',
      'điện thoại tốt nhất',
      'mua điện thoại',
      'tai nghe tốt nhất',
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
    return (text ?? '')
      .toLowerCase()
      .normalize('NFC')
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
      .replace(/[?!.。]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
    if (query.includes('quy trình') || query.includes('thủ tục')) {
      return 'process_lookup';
    }

    if (
      this.hasAny(query, [
        'hồ sơ',
        'giấy tờ',
        'mẫu',
        'quyết định',
        'nghị quyết',
        'văn bản',
        'thông báo',
        'tuyên thệ',
        'lời tuyên thệ',
        'lời thề',
        'lễ kết nạp',
        'kết nạp đảng',
      ])
    ) {
      return 'document_lookup';
    }

    return 'policy_lookup';
  }
}
