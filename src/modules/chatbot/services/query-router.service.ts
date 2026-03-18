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
  | 'party_fee_lookup'
  | 'member_profile_lookup'
  | 'organization_lookup';

export type ClarificationType =
  | 'meeting_target'
  | 'information_type'
  | 'list_target'
  | 'profile_type'
  | 'relative_date'
  | 'document_target'
  | 'unknown';

export type RouteDecision = {
  mode: ChatRouteMode;
  intent:
    | 'policy_lookup'
    | 'process_lookup'
    | 'document_lookup'
    | 'meeting_lookup'
    | 'party_fee_lookup'
    | 'member_profile_lookup'
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

    const clarification = this.detectAmbiguity(q);
    if (clarification) {
      return clarification;
    }

    const hasPersonal =
      this.hasAny(q, [
        'tôi',
        'của tôi',
        'mình',
        'em',
        'tôi đã',
        'tôi có',
        'tôi thuộc',
      ]) || /\btoi\b/.test(q);

    const hasDynamicTime = this.hasAny(q, [
      'hôm nay',
      'tuần này',
      'tháng này',
      'hiện tại',
      'gần đây',
      'sắp tới',
      'tiếp theo',
    ]);

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

    const hasPartyFee = this.hasAny(q, [
      'đảng phí',
      'đóng phí',
      'đóng đảng phí',
      'còn thiếu phí',
      'nợ đảng phí',
    ]);

    const hasProfile = this.hasAny(q, [
      'chi bộ nào',
      'hồ sơ của tôi',
      'trạng thái hồ sơ',
      'tôi là đảng viên',
      'vào đảng ngày nào',
      'công nhận chính thức',
      'nhiệm vụ của tôi',
      'giúp đỡ tôi',
      'hồ sơ cá nhân',
      'lý lịch',
      'lý lịch đảng viên',
    ]);

    const hasOrganization = this.hasAny(q, [
      'bí thư là ai',
      'phó bí thư là ai',
      'chi bộ có bao nhiêu đảng viên',
      'ban chi ủy',
      'chi bộ trực thuộc',
      'đảng bộ nào',
      'thông tin đảng',
      'thông tin tổ chức đảng',
      'thông tin chi bộ',
    ]);

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
      'giấy giới thiệu',
      'lời tuyên thệ',
      'quyết định',
      'văn bản',
      'thông báo',
      'quy định',
    ]);

    const needsTool =
      hasMeeting ||
      hasPartyFee ||
      hasProfile ||
      hasOrganization ||
      (hasPersonal && hasDynamicTime);

    const needsRag = hasPolicy;

    if (needsTool && needsRag) {
      const tools = this.pickTools({
        hasMeeting,
        hasPartyFee,
        hasProfile,
        hasOrganization,
      });

      return {
        mode: 'hybrid',
        intent: 'hybrid_lookup',
        tools,
        reason:
          'Câu hỏi vừa cần dữ liệu hệ thống vừa cần tra cứu tài liệu/quy định.',
      };
    }

    if (needsTool) {
      const tools = this.pickTools({
        hasMeeting,
        hasPartyFee,
        hasProfile,
        hasOrganization,
      });

      return {
        mode: 'tool',
        intent: this.pickIntent({
          hasMeeting,
          hasPartyFee,
          hasProfile,
          hasOrganization,
        }),
        tools,
        reason: 'Câu hỏi thiên về dữ liệu động/cá nhân trong hệ thống.',
      };
    }

    if (needsRag) {
      return {
        mode: 'rag',
        intent: this.pickRagIntent(q),
        reason:
          'Câu hỏi thiên về quy trình, quy định, biểu mẫu hoặc tài liệu.',
      };
    }

    return {
      mode: 'clarify',
      intent: 'clarification',
      reason: 'Câu hỏi chưa đủ rõ để xác định nghiệp vụ cần hỗ trợ.',
      clarificationType: 'information_type',
      clarificationQuestion:
        'Bạn muốn tra cứu nội dung nào trong hệ thống: hồ sơ, quy trình, meeting, đảng phí hay thông tin tổ chức?',
    };
  }

  private detectOutOfScope(query: string): RouteDecision | null {
    if (this.isWeatherQuery(query)) {
      return this.buildOutOfScope(
        'Câu hỏi về thời tiết ngoài phạm vi hỗ trợ của chatbot.',
        'Tôi chuyên hỗ trợ tra cứu nghiệp vụ Đảng viên trong hệ thống. Bạn hãy hỏi về hồ sơ, quy trình, meeting, đảng phí hoặc thông tin tổ chức.',
      );
    }

    if (this.isCryptoOrPriceQuery(query)) {
      return this.buildOutOfScope(
        'Câu hỏi về giá tài sản/thị trường ngoài phạm vi hỗ trợ.',
        'Tôi không hỗ trợ tra cứu giá thị trường như Bitcoin. Tôi chuyên hỗ trợ nghiệp vụ Đảng viên trong hệ thống.',
      );
    }

    if (this.isEssayOrLongWritingQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu viết bài ngoài phạm vi chatbot nghiệp vụ.',
        'Tôi không hỗ trợ viết bài văn hoặc nội dung dài ngoài phạm vi hệ thống. Tôi chuyên hỗ trợ tra cứu nghiệp vụ Đảng viên.',
      );
    }

    if (this.isJokeQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu giải trí ngoài phạm vi chatbot nghiệp vụ.',
        'Tôi không hỗ trợ kể chuyện cười. Tôi chuyên hỗ trợ tra cứu hồ sơ, quy trình, meeting, đảng phí và thông tin tổ chức trong hệ thống.',
      );
    }

    if (this.isTranslationQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu dịch thuật ngoài phạm vi chatbot nghiệp vụ.',
        'Tôi không hỗ trợ dịch thuật chung. Tôi chuyên hỗ trợ tra cứu nghiệp vụ Đảng viên trong hệ thống.',
      );
    }

    if (this.isProgrammingQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu lập trình ngoài phạm vi chatbot nghiệp vụ.',
        'Tôi không hỗ trợ lập trình website hoặc phần mềm ngoài phạm vi hệ thống này. Tôi chuyên hỗ trợ nghiệp vụ Đảng viên.',
      );
    }

    if (this.isSportsOpinionQuery(query)) {
      return this.buildOutOfScope(
        'Câu hỏi quan điểm cá nhân ngoài phạm vi chatbot nghiệp vụ.',
        'Tôi không trao đổi về chủ đề giải trí như bóng đá. Tôi chuyên hỗ trợ tra cứu nghiệp vụ Đảng viên trong hệ thống.',
      );
    }

    if (this.isFoodOrderQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu đặt đồ ăn ngoài phạm vi hệ thống.',
        'Tôi không hỗ trợ đặt đồ ăn. Tôi chuyên hỗ trợ tra cứu hồ sơ, quy trình, meeting, đảng phí và thông tin tổ chức.',
      );
    }

    if (this.isFortuneTellingQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu xem bói ngoài phạm vi hỗ trợ.',
        'Tôi không hỗ trợ xem bói. Tôi chuyên hỗ trợ các nội dung nghiệp vụ Đảng viên trong hệ thống.',
      );
    }

    if (this.isGeneralRecommendationQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu gợi ý đời sống ngoài phạm vi chatbot nghiệp vụ.',
        'Tôi không hỗ trợ các gợi ý đời sống như học guitar, xem phim hay hoạt động cá nhân. Tôi chuyên hỗ trợ nghiệp vụ Đảng viên trong hệ thống.',
      );
    }

    if (this.isMathHomeworkQuery(query)) {
      return this.buildOutOfScope(
        'Yêu cầu giải bài tập ngoài phạm vi chatbot nghiệp vụ.',
        'Tôi không hỗ trợ giải toán hoặc bài tập ngoài phạm vi hệ thống. Tôi chuyên hỗ trợ tra cứu nghiệp vụ Đảng viên.',
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

  private detectAmbiguity(query: string): RouteDecision | null {
    if (this.isAmbiguousMeeting(query)) {
      return {
        mode: 'clarify',
        intent: 'clarification',
        reason: 'Người dùng hỏi về meeting nhưng chưa nêu rõ meeting nào.',
        clarificationType: 'meeting_target',
        clarificationQuestion:
          'Bạn muốn xem meeting nào hoặc trong khoảng thời gian nào? Ví dụ: cuộc họp gần nhất, họp tháng này, hay họp ngày 20/06/2026.',
      };
    }

    if (this.isAmbiguousPartyInfo(query)) {
      return {
        mode: 'clarify',
        intent: 'clarification',
        reason: 'Người dùng hỏi thông tin Đảng nhưng chưa nêu rõ loại thông tin.',
        clarificationType: 'information_type',
        clarificationQuestion:
          'Bạn muốn xem loại thông tin nào: hồ sơ, quy trình, meeting, đảng phí hay thông tin tổ chức?',
      };
    }

    if (this.isAmbiguousList(query)) {
      return {
        mode: 'clarify',
        intent: 'clarification',
        reason: 'Người dùng yêu cầu xem danh sách nhưng chưa nêu rõ danh sách gì.',
        clarificationType: 'list_target',
        clarificationQuestion:
          'Bạn muốn xem danh sách gì? Ví dụ: danh sách đảng viên, danh sách cuộc họp, danh sách hồ sơ, hay danh sách đảng phí.',
      };
    }

    if (this.isAmbiguousProfile(query)) {
      return {
        mode: 'clarify',
        intent: 'clarification',
        reason: 'Người dùng hỏi về hồ sơ nhưng chưa nêu rõ loại hồ sơ.',
        clarificationType: 'profile_type',
        clarificationQuestion:
          'Bạn muốn xem hồ sơ nào: hồ sơ kết nạp, hồ sơ chuyển sinh hoạt, hay hồ sơ cá nhân?',
      };
    }

    if (this.isAmbiguousRelativeDate(query)) {
      return {
        mode: 'clarify',
        intent: 'clarification',
        reason: 'Người dùng dùng mốc thời gian tương đối nhưng chưa rõ ngày cụ thể.',
        clarificationType: 'relative_date',
        clarificationQuestion:
          'Bạn đang nói “hôm đó” là ngày nào? Bạn có thể cho tôi ngày cụ thể, ví dụ 20/06/2026.',
      };
    }

    if (this.isAmbiguousDocument(query)) {
      return {
        mode: 'clarify',
        intent: 'clarification',
        reason:
          'Người dùng hỏi về văn bản/tài liệu nhưng chưa nêu rõ văn bản nào.',
        clarificationType: 'document_target',
        clarificationQuestion:
          'Bạn muốn hỏi về quyết định/văn bản nào? Bạn có thể cho tôi số văn bản, tên văn bản hoặc nội dung cụ thể cần tra cứu.',
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

  private isAmbiguousPartyInfo(query: string): boolean {
    const exactPatterns = [
      'tôi muốn xem thông tin đảng',
      'xem thông tin đảng',
      'cho tôi xem thông tin đảng',
      'tôi muốn biết thông tin đảng',
      'xem thông tin đảng viên',
      'xem thông tin chi bộ',
    ];

    return exactPatterns.includes(query);
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

  private isAmbiguousProfile(query: string): boolean {
    const exactPatterns = [
      'tôi muốn biết về hồ sơ',
      'cho tôi biết về hồ sơ',
      'xem hồ sơ',
      'tôi muốn xem hồ sơ',
      'hồ sơ là gì',
      'cho tôi xem hồ sơ',
    ];

    return exactPatterns.includes(query);
  }

  private isAmbiguousRelativeDate(query: string): boolean {
    const hasRelativeWord = this.hasAny(query, [
      'hôm đó',
      'bữa đó',
      'hôm ấy',
      'ngày đó',
    ]);
    const mentionsMeeting = this.hasAny(query, [
      'họp',
      'meeting',
      'cuộc họp',
      'lịch họp',
    ]);
    const hasSpecificDate = this.hasDate(query);

    return hasRelativeWord && mentionsMeeting && !hasSpecificDate;
  }

  private isAmbiguousDocument(query: string): boolean {
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
      /\bsố\b/.test(query) ||
      /\bso\b/.test(query) ||
      /\b\d+[-/A-Z0-9]*\b/.test(query) ||
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

  private isJokeQuery(query: string): boolean {
    return this.hasAny(query, [
      'kể chuyện cười',
      'kể chuyện vui',
      'joke',
      'truyện cười',
    ]);
  }

  private isTranslationQuery(query: string): boolean {
    return this.hasAny(query, [
      'dịch đoạn văn này',
      'dịch sang tiếng anh',
      'translate',
      'dịch giúp tôi',
      'dịch đoạn này',
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

  private isSportsOpinionQuery(query: string): boolean {
    return (
      this.hasAny(query, [
        'bạn nghĩ gì về bóng đá',
        'bóng đá',
        'cầu thủ',
        'ngoại hạng anh',
        'champions league',
      ]) && this.hasAny(query, ['nghĩ gì', 'quan điểm', 'ý kiến'])
    );
  }

  private isFoodOrderQuery(query: string): boolean {
    return this.hasAny(query, [
      'đặt đồ ăn',
      'order đồ ăn',
      'gọi đồ ăn',
      'đặt trà sữa',
      'đặt cơm',
    ]);
  }

  private isFortuneTellingQuery(query: string): boolean {
    return this.hasAny(query, [
      'xem bói',
      'bói',
      'tử vi',
      'xem mệnh',
      'coi bói',
    ]);
  }

  private isGeneralRecommendationQuery(query: string): boolean {
    return this.hasAny(query, [
      'học guitar ở đâu tốt',
      'xem phim gì tối nay',
      'nên xem phim gì',
      'đi đâu chơi',
      'ăn gì tối nay',
      'nên học ở đâu',
    ]);
  }

  private isMathHomeworkQuery(query: string): boolean {
    return this.hasAny(query, [
      'giải bài toán',
      'giải bài này',
      'giải giúp tôi bài toán',
      'toán này giải sao',
      'giải phương trình',
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
    hasPartyFee: boolean;
    hasProfile: boolean;
    hasOrganization: boolean;
  }): ToolName[] {
    const tools: ToolName[] = [];

    if (flags.hasMeeting) tools.push('meeting_lookup');
    if (flags.hasPartyFee) tools.push('party_fee_lookup');
    if (flags.hasProfile) tools.push('member_profile_lookup');
    if (flags.hasOrganization) tools.push('organization_lookup');

    if (!tools.length) {
      tools.push('member_profile_lookup');
    }

    return tools;
  }

  private pickIntent(flags: {
    hasMeeting: boolean;
    hasPartyFee: boolean;
    hasProfile: boolean;
    hasOrganization: boolean;
  }): RouteDecision['intent'] {
    if (flags.hasMeeting) return 'meeting_lookup';
    if (flags.hasPartyFee) return 'party_fee_lookup';
    if (flags.hasProfile) return 'member_profile_lookup';
    if (flags.hasOrganization) return 'organization_lookup';
    return 'unknown';
  }

  private pickRagIntent(query: string): RouteDecision['intent'] {
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