import { Injectable } from '@nestjs/common';

export type ChatRouteMode = 'rag' | 'clarify' | 'out_of_scope' | 'blocked';

export type RagIntent =
  | 'policy_lookup'
  | 'process_lookup'
  | 'document_lookup'
  | 'discipline_lookup'
  | 'fee_lookup'
  | 'admission_lookup'
  | 'meeting_lookup'
  | 'profile_lookup'
  | 'inspection_lookup'
  | 'unknown';

export type ClarificationType =
  | 'ambiguous_reference'
  | 'document_target'
  | 'missing_context'
  | 'too_short'
  | 'unknown';

export type RouteDecision = {
  mode: ChatRouteMode;
  intent: RagIntent | 'clarification' | 'out_of_scope' | 'blocked';
  confidence: number;
  reason: string;
  matchedSignals: string[];
  clarificationType?: ClarificationType;
  clarificationQuestion?: string;
  outOfScopeMessage?: string;
  blockedMessage?: string;
};

type SignalProfile = {
  name: string;
  intent?: RagIntent;
  weight: number;
  keywords: string[];
  patterns?: RegExp[];
};

@Injectable()
export class QueryRouterService {
  private readonly MIN_RAG_CONFIDENCE = 0.3;
  private readonly MIN_CLARIFY_CONFIDENCE = 0.45;
  private readonly MIN_OUT_OF_SCOPE_CONFIDENCE = 0.5;

  private readonly domainProfiles: SignalProfile[] = [
    {
      name: 'policy',
      intent: 'policy_lookup',
      weight: 0.35,
      keywords: [
        'quy định',
        'điều lệ',
        'nguyên tắc',
        'trách nhiệm',
        'quyền hạn',
        'nghĩa vụ',
        'áp dụng',
        'thi hành',
        'kiểm tra',
        'giám sát',
      ],
    },
    {
      name: 'process',
      intent: 'process_lookup',
      weight: 0.35,
      keywords: [
        'quy trình',
        'thủ tục',
        'các bước',
        'hồ sơ',
        'giấy tờ',
        'cần chuẩn bị',
        'xử lý như thế nào',
        'thực hiện như thế nào',
      ],
    },
    {
      name: 'document',
      intent: 'document_lookup',
      weight: 0.3,
      keywords: [
        'văn bản',
        'tài liệu',
        'biểu mẫu',
        'mẫu đơn',
        'quyết định',
        'nghị quyết',
        'thông báo',
        'công văn',
      ],
    },
    {
      name: 'discipline',
      intent: 'discipline_lookup',
      weight: 0.45,
      keywords: [
        'kỷ luật',
        'khiển trách',
        'cảnh cáo',
        'cách chức',
        'khai trừ',
        'vi phạm',
        'tái phạm',
        'xử lý',
        'hình thức kỷ luật',
      ],
    },
    {
      name: 'party_fee',
      intent: 'fee_lookup',
      weight: 0.4,
      keywords: [
        'đảng phí',
        'mức đóng',
        'đóng phí',
        'miễn đảng phí',
        'giảm đảng phí',
      ],
    },
    {
      name: 'admission',
      intent: 'admission_lookup',
      weight: 0.52,
      keywords: [
        // core
        'kết nạp đảng',
        'kết nạp đảng viên',
        'đề nghị kết nạp',
        'đề nghị kết nạp một người vào đảng',
        'vào đảng',
        'người vào đảng',
        'người xin vào đảng',

        // process
        'xem xét kết nạp',
        'trước khi đề nghị kết nạp',
        'điều kiện kết nạp',
        'tiêu chuẩn kết nạp',
        'quy trình kết nạp',
        'thủ tục kết nạp',

        // hồ sơ
        'hồ sơ kết nạp',
        'thành phần hồ sơ kết nạp',
        'giấy tờ kết nạp',

        // tổ chức
        'chi bộ đề nghị',
        'chi bộ xem xét kết nạp',
        'tổ chức đảng đề nghị',

        // trạng thái đảng viên
        'đảng viên mới',
        'đảng viên dự bị',
        'công nhận đảng viên chính thức',

        // nghi thức
        'lễ kết nạp',
        'tuyên thệ',
        'lời tuyên thệ',
      ]
    },
    {
      name: 'inspection_supervision',
      intent: 'policy_lookup',
      weight: 0.52,
      keywords: [
        'kiểm tra',
        'giám sát',
        'kết quả giám sát',
        'kết quả kiểm tra',
        'công tác kiểm tra',
        'công tác giám sát',
        'dùng để làm gì',
        'xem xét xử lý',
        'đánh giá tổ chức đảng',
        'đánh giá đảng viên',
      ],
    },
    {
      name: 'profile',
      intent: 'profile_lookup',
      weight: 0.5,
      keywords: [
        'hồ sơ đảng viên',
        'lý lịch đảng viên',
        'quản lý hồ sơ',
        'phiếu đảng viên',

        'thẻ đảng viên',
        'mất thẻ đảng viên',
        'bị mất thẻ đảng viên',
        'cấp lại thẻ đảng viên',
        'đổi thẻ đảng viên',
        'phát thẻ đảng viên',
        'sử dụng thẻ đảng viên',
        'quản lý thẻ đảng viên',

        'giới thiệu sinh hoạt đảng',
        'chuyển sinh hoạt đảng',
      ],
    }, {
      name: 'meeting',
      intent: 'meeting_lookup',
      weight: 0.52,
      keywords: [
        'sinh hoạt chi bộ',
        'tham gia sinh hoạt chi bộ',
        'sinh hoạt định kỳ',
        'tham gia sinh hoạt định kỳ',
        'nghĩa vụ tham gia sinh hoạt',
        'đảng viên tham gia sinh hoạt',
        'họp chi bộ',
        'cuộc họp chi bộ',
        'vắng sinh hoạt chi bộ',
        'không tham gia sinh hoạt chi bộ',
        'miễn sinh hoạt đảng',
        'sinh hoạt đảng',
      ],
    },
    {
      name: 'inspection_supervision',
      intent: 'inspection_lookup',
      weight: 0.55,
      keywords: [
        'kiểm tra',
        'giám sát',
        'tự kiểm tra',
        'công tác kiểm tra',
        'công tác giám sát',
        'kết quả kiểm tra',
        'kết quả giám sát',
      ],
    }
  ];

  private readonly outOfScopeProfiles: SignalProfile[] = [
    {
      name: 'weather',
      weight: 0.7,
      keywords: ['thời tiết', 'nhiệt độ', 'trời mưa', 'dự báo thời tiết'],
    },
    {
      name: 'market',
      weight: 0.7,
      keywords: [
        'vn-index',
        'chứng khoán',
        'cổ phiếu',
        'giá vàng',
        'giá usd',
        'bitcoin',
        'crypto',
      ],
    },
    {
      name: 'math',
      weight: 0.7,
      keywords: [
        'đạo hàm',
        'tích phân',
        'phương trình',
        'lượng giác',
        'công thức toán',
      ],
    },
    {
      name: 'entertainment',
      weight: 0.7,
      keywords: ['netflix', 'phim hay', 'diễn viên', 'ca sĩ', 'xem phim'],
    },
    {
      name: 'shopping',
      weight: 0.7,
      keywords: [
        'laptop gaming',
        'mua laptop',
        'điện thoại tốt nhất',
        'tai nghe tốt nhất',
      ],
    },
    {
      name: 'programming',
      weight: 0.7,
      keywords: [
        'viết code',
        'lập trình',
        'tạo website',
        'web bán hàng',
        'ứng dụng mobile',
      ],
    },
  ];

  private readonly ambiguityProfiles: SignalProfile[] = [
    {
      name: 'ambiguous_reference',
      weight: 0.7,
      keywords: [
        'trường hợp này',
        'quy định này',
        'điều này',
        'nội dung này',
        'việc này',
        'mức này',
        'hình thức này',
        'trường hợp đặc biệt',
      ],
    },
    {
      name: 'ambiguous_document',
      weight: 0.65,
      keywords: [
        'xem văn bản',
        'cho tôi xem văn bản',
        'xem tài liệu',
        'cho tôi xem tài liệu',
        'xem mẫu',
        'cho tôi xem mẫu',
        'xem quyết định',
        'xem nghị quyết',
      ],
    },
  ];

  decide(query: string): RouteDecision {
    const normalizedQuery = this.normalize(query);

    if (!normalizedQuery) {
      return this.buildClarify(
        'missing_context',
        1,
        [],
        'Người dùng chưa nhập câu hỏi.',
        'Câu hỏi của bạn đang trống. Vui lòng nhập nội dung cần tra cứu.',
      );
    }

    if (normalizedQuery.length < 4) {
      return this.buildClarify(
        'too_short',
        0.9,
        [],
        'Câu hỏi quá ngắn, chưa đủ thông tin để tra cứu.',
        'Bạn vui lòng nhập rõ hơn nội dung cần hỏi.',
      );
    }

    const outOfScopeScore = this.scoreProfiles(
      normalizedQuery,
      this.outOfScopeProfiles,
    );

    const ambiguityScore = this.scoreProfiles(
      normalizedQuery,
      this.ambiguityProfiles,
    );

    const ragScore = this.scoreProfiles(normalizedQuery, this.domainProfiles);

    const questionScore = this.scoreQuestionShape(normalizedQuery);
    const finalRagConfidence = this.clamp01(
      ragScore.confidence * 0.75 + questionScore * 0.25,
    );

    if (
      outOfScopeScore.confidence >= this.MIN_OUT_OF_SCOPE_CONFIDENCE &&
      outOfScopeScore.confidence > finalRagConfidence
    ) {
      return this.buildOutOfScope(
        outOfScopeScore.confidence,
        outOfScopeScore.matchedSignals,
        'Câu hỏi có tín hiệu ngoài phạm vi hệ thống RAG nghiệp vụ.',
      );
    }

    if (
      ambiguityScore.confidence >= this.MIN_CLARIFY_CONFIDENCE &&
      ambiguityScore.confidence >= finalRagConfidence
    ) {
      return this.buildClarify(
        this.resolveClarificationType(ambiguityScore.bestProfileName),
        ambiguityScore.confidence,
        ambiguityScore.matchedSignals,
        'Câu hỏi có tham chiếu mơ hồ hoặc thiếu đối tượng cần tra cứu.',
        this.resolveClarificationQuestion(ambiguityScore.bestProfileName),
      );
    }

    if (finalRagConfidence >= this.MIN_RAG_CONFIDENCE) {
      return {
        mode: 'rag',
        intent: ragScore.intent ?? 'policy_lookup',
        confidence: this.round(finalRagConfidence),
        matchedSignals: ragScore.matchedSignals,
        reason:
          'Câu hỏi có đủ tín hiệu thuộc phạm vi tài liệu nội bộ, phù hợp để tra cứu bằng RAG.',
      };
    }

    if (this.looksLikeQuestion(normalizedQuery)) {
      return {
        mode: 'rag',
        intent: 'unknown',
        confidence: this.round(Math.max(finalRagConfidence, 0.3)),
        matchedSignals: ragScore.matchedSignals,
        reason:
          'Câu hỏi có dạng truy vấn nhưng chưa xác định rõ nhóm nghiệp vụ. Cho phép RAG xử lý để tránh từ chối nhầm.',
      };
    }

    return this.buildClarify(
      'unknown',
      this.round(finalRagConfidence),
      ragScore.matchedSignals,
      'Không đủ tín hiệu để xác định người dùng muốn tra cứu nội dung gì.',
      'Bạn vui lòng nêu rõ nội dung cần tra cứu, ví dụ: quy định, thủ tục, hồ sơ, kỷ luật, đảng phí hoặc kết nạp Đảng.',
    );
  }

  private scoreProfiles(
    query: string,
    profiles: SignalProfile[],
  ): {
    confidence: number;
    intent?: RagIntent;
    matchedSignals: string[];
    bestProfileName?: string;
  } {
    let bestScore = 0;
    let bestIntent: RagIntent | undefined;
    let bestProfileName: string | undefined;
    const matchedSignals = new Set<string>();

    for (const profile of profiles) {
      const keywordMatches = profile.keywords.filter((keyword) =>
        query.includes(keyword),
      );

      const patternMatches =
        profile.patterns?.filter((pattern) => pattern.test(query)) ?? [];

      const totalSignals = profile.keywords.length + (profile.patterns?.length ?? 0);
      const matchedCount = keywordMatches.length + patternMatches.length;

      if (matchedCount === 0 || totalSignals === 0) continue;

      const coverageScore = matchedCount / totalSignals;
      const densityScore = Math.min(1, matchedCount / 3);
      const profileScore = this.clamp01(
        profile.weight * 0.6 + coverageScore * 0.2 + densityScore * 0.2,
      );

      keywordMatches.forEach((item) =>
        matchedSignals.add(`${profile.name}:${item}`),
      );

      patternMatches.forEach((_, index) =>
        matchedSignals.add(`${profile.name}:pattern_${index + 1}`),
      );

      if (profileScore > bestScore) {
        bestScore = profileScore;
        bestIntent = profile.intent;
        bestProfileName = profile.name;
      }
    }

    return {
      confidence: this.round(bestScore),
      intent: bestIntent,
      matchedSignals: Array.from(matchedSignals),
      bestProfileName,
    };
  }

  private scoreQuestionShape(query: string): number {
    let score = 0;

    if (this.looksLikeQuestion(query)) score += 0.45;

    if (
      this.hasAny(query, [
        'có được không',
        'có bắt buộc không',
        'có phải không',
        'như thế nào',
        'là gì',
        'bao nhiêu',
        'khi nào',
        'ai',
        'ở đâu',
        'vì sao',
        'tại sao',
      ])
    ) {
      score += 0.35;
    }

    const wordCount = query.split(' ').filter(Boolean).length;
    if (wordCount >= 5) score += 0.2;

    return this.clamp01(score);
  }

  private buildOutOfScope(
    confidence: number,
    matchedSignals: string[],
    reason: string,
  ): RouteDecision {
    return {
      mode: 'out_of_scope',
      intent: 'out_of_scope',
      confidence: this.round(confidence),
      matchedSignals,
      reason,
      outOfScopeMessage:
        'Câu hỏi này nằm ngoài phạm vi hỗ trợ của hệ thống. Hệ thống hiện chỉ hỗ trợ tra cứu quy định, Điều lệ Đảng, kỷ luật Đảng viên, công tác tổ chức, quản lý Đảng viên, tài liệu nội bộ và các nội dung nghiệp vụ liên quan.',
    };
  }

  private buildClarify(
    clarificationType: ClarificationType,
    confidence: number,
    matchedSignals: string[],
    reason: string,
    clarificationQuestion: string,
  ): RouteDecision {
    return {
      mode: 'clarify',
      intent: 'clarification',
      confidence: this.round(confidence),
      matchedSignals,
      reason,
      clarificationType,
      clarificationQuestion,
    };
  }

  private resolveClarificationType(profileName?: string): ClarificationType {
    switch (profileName) {
      case 'ambiguous_reference':
        return 'ambiguous_reference';
      case 'ambiguous_document':
        return 'document_target';
      default:
        return 'unknown';
    }
  }

  private resolveClarificationQuestion(profileName?: string): string {
    switch (profileName) {
      case 'ambiguous_reference':
        return 'Câu hỏi của bạn chưa đủ thông tin để xác định chính xác nội dung cần tra cứu. Vui lòng nêu rõ quy định, điều khoản, văn bản hoặc tình huống cụ thể.';
      case 'ambiguous_document':
        return 'Bạn muốn hỏi về văn bản/tài liệu nào? Bạn có thể cho tôi tên tài liệu hoặc nội dung cụ thể cần tra cứu.';
      default:
        return 'Bạn vui lòng nói rõ hơn nội dung cần tra cứu.';
    }
  }

  private looksLikeQuestion(query: string): boolean {
    return (
      query.includes('?') ||
      this.hasAny(query, [
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
        'có bắt buộc không',
        'cần làm gì',
        'làm gì',
        'có nghĩa vụ',
        'tham gia'
      ])
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

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private round(value: number): number {
    return Math.round(value * 1000) / 1000;
  }
}