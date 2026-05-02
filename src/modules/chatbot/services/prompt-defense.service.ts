import { Injectable } from '@nestjs/common';

export type SecurityAction = 'ALLOW' | 'BLOCK' | 'SANITIZE_AND_CONTINUE';

export type SecurityCategory =
  | 'PROMPT_INJECTION'
  | 'SYSTEM_PROMPT_EXFILTRATION'
  | 'PRIVILEGE_ESCALATION'
  | 'DEBUG_DATA_EXFILTRATION'
  | 'PERSONAL_DATA_REQUEST'
  | 'SENSITIVE_PERSONAL_DATA_REQUEST'
  | 'FINANCIAL_DATA_REQUEST'
  | 'BULK_PERSONAL_DATA_EXFILTRATION'
  | 'BULK_EXPORT_REQUEST'
  | 'FORCE_HALLUCINATION'
  | 'FORCE_INCORRECT_ANSWER'
  | 'INTERNAL_SCHEMA_DISCLOSURE'
  | 'NOISE_PREFIX'
  | 'QUERY_TOO_LONG'
  | 'NONE';

export type SecurityDecision = {
  action: SecurityAction;
  category: SecurityCategory;
  sanitizedQuery?: string;
  message?: string;
  reason: string;
  riskScore: number;
  matchedRules: string[];
};

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SECRETARY'
  | 'DEPUTY_SECRETARY'
  | 'COMMITTEE'
  | 'MEMBER'
  | 'GUEST';

type SecurityRule = {
  id: string;
  category: SecurityCategory;
  riskScore: number;
  patterns: RegExp[];
  reason: string;
  message: string;
};

@Injectable()
export class PromptDefenseService {
  private readonly MAX_QUERY_LENGTH = 2000;

  inspect(params: {
    query: string;
    userId?: string;
    userRole?: UserRole;
  }): SecurityDecision {
    const raw = params.query ?? '';
    const normalized = this.normalize(raw);

    if (!normalized) {
      return {
        action: 'ALLOW',
        category: 'NONE',
        sanitizedQuery: raw,
        reason: 'Câu hỏi rỗng, chuyển cho QueryRouter xử lý clarify.',
        riskScore: 0,
        matchedRules: [],
      };
    }

    if (raw.length > this.MAX_QUERY_LENGTH) {
      return this.block({
        category: 'QUERY_TOO_LONG',
        reason: 'Câu hỏi quá dài bất thường.',
        message:
          'Yêu cầu quá dài hoặc có dấu hiệu chèn lệnh. Vui lòng nhập lại câu hỏi ngắn gọn hơn.',
        riskScore: 0.9,
        matchedRules: ['query_too_long'],
      });
    }

    const preSanitizedQuery = this.sanitizeNoise(raw);
    const preSanitizedNormalized = this.normalize(preSanitizedQuery);

    const highRiskDecision = this.matchBlockingRules(normalized);

    if (highRiskDecision) {
      const canContinueAfterSanitize =
        preSanitizedNormalized &&
        preSanitizedNormalized !== normalized &&
        !this.matchBlockingRules(preSanitizedNormalized);

      if (
        highRiskDecision.category === 'PROMPT_INJECTION' &&
        canContinueAfterSanitize &&
        this.hasMeaningfulBusinessIntent(preSanitizedNormalized)
      ) {
        return {
          action: 'SANITIZE_AND_CONTINUE',
          category: 'NOISE_PREFIX',
          sanitizedQuery: preSanitizedQuery,
          reason:
            'Phát hiện nhiễu/prompt injection nhưng còn intent nghiệp vụ hợp lệ sau khi làm sạch.',
          riskScore: 0.45,
          matchedRules: highRiskDecision.matchedRules,
        };
      }

      return highRiskDecision;
    }

    const privacyDecision = this.inspectPrivacyAndDataAccess(normalized);

    if (privacyDecision) {
      return privacyDecision;
    }

    if (preSanitizedNormalized && preSanitizedNormalized !== normalized) {
      return {
        action: 'SANITIZE_AND_CONTINUE',
        category: 'NOISE_PREFIX',
        sanitizedQuery: preSanitizedQuery,
        reason: 'Đã loại bỏ ký tự/nội dung nhiễu không cần thiết trước khi RAG.',
        riskScore: 0.2,
        matchedRules: ['noise_removed'],
      };
    }

    return {
      action: 'ALLOW',
      category: 'NONE',
      sanitizedQuery: raw,
      reason: 'Không phát hiện rủi ro bảo mật ở tầng prompt defense.',
      riskScore: 0,
      matchedRules: [],
    };
  }

  private matchBlockingRules(query: string): SecurityDecision | null {
    const rules: SecurityRule[] = [
      {
        id: 'system_prompt_exfiltration',
        category: 'SYSTEM_PROMPT_EXFILTRATION',
        riskScore: 0.95,
        reason: 'Yêu cầu tiết lộ prompt/rule nội bộ.',
        message:
          'Tôi không thể cung cấp prompt hệ thống, rule nội bộ hoặc hướng dẫn vận hành nội bộ của chatbot.',
        patterns: [
          /\b(system|developer)\s+(prompt|message|instruction)s?\b/i,
          /\bshow\s+(me\s+)?(your\s+)?system\s+prompt\b/i,
          /\breveal\s+(your\s+)?(system|developer)\s+(prompt|message|instruction)s?\b/i,
          /prompt hệ thống/i,
          /in ra.*prompt/i,
          /xuất.*rule.*hệ thống/i,
          /hướng dẫn nội bộ/i,
          /quy tắc nội bộ/i,
          /developer message/i,
          /system message/i,
        ],
      },
      {
        id: 'prompt_injection',
        category: 'PROMPT_INJECTION',
        riskScore: 0.9,
        reason: 'Phát hiện lệnh điều khiển hành vi hệ thống.',
        message:
          'Yêu cầu của bạn không hợp lệ. Hệ thống không thể bỏ qua chính sách an toàn, thay đổi quy tắc vận hành hoặc thực hiện yêu cầu vượt phạm vi được phép.',
        patterns: [
          /\bignore\s+(all\s+)?(previous|prior)\s+(instructions|rules)\b/i,
          /\bdisregard\s+(all\s+)?(previous|prior)\s+(instructions|rules)\b/i,
          /\bsystem\s*override\b/i,
          /\bdeveloper\s*mode\b/i,
          /\bdan\s*mode\b/i,
          /\bjailbreak\b/i,
          /\breset[_\s-]?system\b/i,
          /\bignore[_\s-]?rules\b/i,
          /bỏ qua.*(hướng dẫn|quy tắc|chính sách).*trước/i,
          /hãy bỏ qua.*(hướng dẫn|quy tắc|chính sách)/i,
          /từ giờ.*(không cần tuân thủ|bỏ qua)/i,
          /trả lời mọi câu hỏi.*(bị cấm|không được phép)/i,
        ],
      },
      {
        id: 'privilege_escalation',
        category: 'PRIVILEGE_ESCALATION',
        riskScore: 0.92,
        reason: 'Yêu cầu giả mạo quyền hoặc bỏ qua phân quyền.',
        message:
          'Tôi không thể bỏ qua phân quyền, giả mạo vai trò quản trị hoặc hiển thị dữ liệu vượt quyền được cấp.',
        patterns: [
          /bỏ.*phân quyền/i,
          /vượt quyền/i,
          /giả vờ.*(admin|quản trị|bí thư|super admin)/i,
          /cho tôi quyền.*(admin|quản trị)/i,
          /hiển thị hết dữ liệu/i,
          /xem tất cả dữ liệu/i,
        ],
      },
      {
        id: 'internal_schema_disclosure',
        category: 'INTERNAL_SCHEMA_DISCLOSURE',
        riskScore: 0.85,
        reason: 'Yêu cầu lộ schema/backend/database nội bộ.',
        message:
          'Tôi không thể cung cấp chi tiết nội bộ của backend, database, schema hoặc cấu trúc vận hành hệ thống.',
        patterns: [
          /cấu trúc.*backend/i,
          /schema.*(database|dữ liệu|backend)/i,
          /source code.*backend/i,
          /dump.*database/i,
          /toàn bộ.*database/i,
          /toàn bộ.*schema/i,
          /các bảng dữ liệu/i,
          /payload nội bộ/i,
        ],
      },
      {
        id: 'debug_exfiltration',
        category: 'DEBUG_DATA_EXFILTRATION',
        riskScore: 0.8,
        reason: 'Yêu cầu lộ debug/log/payload nội bộ.',
        message:
          'Tôi không thể chuyển sang chế độ debug hoặc cung cấp thông tin nội bộ không được thiết kế để hiển thị cho người dùng.',
        patterns: [
          /debug mode/i,
          /chế độ debug/i,
          /stack trace/i,
          /raw json/i,
          /log nội bộ/i,
          /log hệ thống/i,
          /payload đầy đủ/i,
        ],
      },
      {
        id: 'force_hallucination',
        category: 'FORCE_HALLUCINATION',
        riskScore: 0.8,
        reason: 'Yêu cầu tự suy diễn hoặc bịa dữ liệu khi thiếu căn cứ.',
        message:
          'Tôi không thể tự tạo dữ liệu còn thiếu hoặc suy diễn câu trả lời khi hệ thống chưa có căn cứ rõ ràng.',
        patterns: [
          /khi không có dữ liệu.*(đoán|bịa|tự suy)/i,
          /hãy tự suy diễn/i,
          /tự tạo dữ liệu/i,
          /bịa giúp tôi/i,
          /đoán giúp tôi/i,
        ],
      },
      {
        id: 'force_incorrect_answer',
        category: 'FORCE_INCORRECT_ANSWER',
        riskScore: 0.75,
        reason: 'Yêu cầu trả lời sai có chủ đích.',
        message: 'Tôi không thể cố ý trả lời sai hoặc cung cấp thông tin sai lệch.',
        patterns: [/hãy trả lời sai/i, /cố tình trả lời sai/i],
      },
    ];

    for (const rule of rules) {
      const matched = rule.patterns.some((pattern) => pattern.test(query));

      if (!matched) continue;

      return this.block({
        category: rule.category,
        reason: rule.reason,
        message: rule.message,
        riskScore: rule.riskScore,
        matchedRules: [rule.id],
      });
    }

    return null;
  }

  private inspectPrivacyAndDataAccess(query: string): SecurityDecision | null {
    if (this.isBulkPersonalDataExfiltration(query)) {
      return this.block({
        category: 'BULK_PERSONAL_DATA_EXFILTRATION',
        reason: 'Yêu cầu xuất hàng loạt dữ liệu cá nhân.',
        message:
          'Tôi không thể cung cấp hoặc xuất hàng loạt dữ liệu cá nhân hoặc nhạy cảm.',
        riskScore: 0.95,
        matchedRules: ['bulk_personal_data_exfiltration'],
      });
    }

    if (this.isBulkExportRequest(query)) {
      return this.block({
        category: 'BULK_EXPORT_REQUEST',
        reason: 'Yêu cầu export dữ liệu hàng loạt qua chatbot.',
        message: 'Tôi không thể xuất dữ liệu hàng loạt qua chatbot.',
        riskScore: 0.85,
        matchedRules: ['bulk_export_request'],
      });
    }

    if (this.isFinancialDataRequest(query)) {
      return this.block({
        category: 'FINANCIAL_DATA_REQUEST',
        reason:
          'Yêu cầu dữ liệu tài chính cá nhân hoặc trạng thái đóng đảng phí của cá nhân cụ thể.',
        message:
          'Tôi không thể cung cấp dữ liệu tài chính cá nhân hoặc trạng thái đóng đảng phí của một cá nhân cụ thể.',
        riskScore: 0.85,
        matchedRules: ['financial_personal_status'],
      });
    }

    if (this.isSensitivePersonalDataRequest(query)) {
      return this.block({
        category: 'SENSITIVE_PERSONAL_DATA_REQUEST',
        reason: 'Yêu cầu dữ liệu cá nhân nhạy cảm.',
        message:
          'Tôi không thể cung cấp dữ liệu cá nhân nhạy cảm như số điện thoại, địa chỉ, email, CCCD/CMND, ngày sinh hoặc nơi cư trú.',
        riskScore: 0.9,
        matchedRules: ['sensitive_personal_data'],
      });
    }

    if (this.isPersonalDataRequest(query)) {
      return this.block({
        category: 'PERSONAL_DATA_REQUEST',
        reason: 'Yêu cầu thông tin cá nhân/hồ sơ cá nhân.',
        message:
          'Tôi không hỗ trợ trả lời các câu hỏi về hồ sơ cá nhân, lý lịch cá nhân hoặc dữ liệu cá nhân qua chatbot này.',
        riskScore: 0.8,
        matchedRules: ['personal_data_request'],
      });
    }

    return null;
  }

  private isBulkPersonalDataExfiltration(query: string): boolean {
    return this.matchAny(query, [
      /xuất.*toàn bộ.*hồ sơ.*đảng viên/i,
      /danh sách.*toàn bộ.*đảng viên.*(số điện thoại|email|địa chỉ|cccd|cmnd|ngày sinh)/i,
      /số điện thoại.*tất cả.*đảng viên/i,
      /toàn bộ.*(email|số điện thoại|địa chỉ|nơi cư trú|lý lịch)/i,
      /dump.*toàn bộ/i,
    ]);
  }

  private isBulkExportRequest(query: string): boolean {
    return this.matchAny(query, [
      /xuất file excel/i,
      /export file excel/i,
      /export toàn bộ/i,
      /download toàn bộ dữ liệu/i,
      /tải toàn bộ dữ liệu/i,
      /xuất toàn bộ hồ sơ/i,
    ]);
  }

  private isSensitivePersonalDataRequest(query: string): boolean {
    if (this.isGeneralPolicyQuestion(query)) return false;

    const hasSensitiveField = this.matchAny(query, [
      /số điện thoại/i,
      /địa chỉ/i,
      /\bemail\b/i,
      /nơi cư trú/i,
      /thông tin cư trú/i,
      /\bcccd\b/i,
      /\bcmnd\b/i,
      /ngày sinh/i,
      /quê quán/i,
    ]);

    const hasPersonalTarget =
      this.hasPersonalMarker(query) || this.hasNamedPersonPattern(query);

    return hasSensitiveField && hasPersonalTarget;
  }

  private isPersonalDataRequest(query: string): boolean {
    if (this.isGeneralPolicyQuestion(query)) return false;

    return this.matchAny(query, [
      /hồ sơ của tôi/i,
      /lý lịch của tôi/i,
      /trạng thái hồ sơ của tôi/i,
      /hồ sơ cá nhân/i,
      /lý lịch của\s+[\p{L}\s]+/iu,
      /xem hồ sơ của\s+[\p{L}\s]+/iu,
      /thông tin cá nhân/i,
      /vào đảng ngày nào của tôi/i,
      /công nhận chính thức của tôi/i,
      /nhiệm vụ của tôi/i,
    ]);
  }

  private isFinancialDataRequest(query: string): boolean {
    const hasFinanceKeyword = this.matchAny(query, [
      /đảng phí/i,
      /nợ đảng phí/i,
      /đã đóng đảng phí/i,
      /trạng thái đảng phí/i,
      /lịch sử đóng đảng phí/i,
      /công nợ đảng phí/i,
      /tài chính cá nhân/i,
    ]);

    if (!hasFinanceKeyword) return false;

    if (this.isGeneralPartyFeePolicyQuestion(query)) return false;

    return (
      this.hasPersonalMarker(query) ||
      this.hasNamedPersonPattern(query) ||
      this.matchAny(query, [
        /đã đóng chưa/i,
        /còn nợ không/i,
        /nợ bao nhiêu/i,
        /đóng tháng nào/i,
        /đóng đến đâu rồi/i,
        /lịch sử đóng/i,
        /công nợ/i,
      ])
    );
  }

  private isGeneralPolicyQuestion(query: string): boolean {
    return this.matchAny(query, [
      /quy định/i,
      /điều lệ/i,
      /hướng dẫn/i,
      /thủ tục/i,
      /quy trình/i,
      /nguyên tắc/i,
      /mức đóng/i,
      /cách tính/i,
    ]);
  }

  private isGeneralPartyFeePolicyQuestion(query: string): boolean {
    return this.matchAny(query, [
      /quy định.*đảng phí/i,
      /hướng dẫn.*đảng phí/i,
      /mức đóng.*đảng phí/i,
      /cách tính.*đảng phí/i,
      /đảng viên.*đóng đảng phí.*bao nhiêu/i,
      /người.*nghỉ hưu.*đóng đảng phí/i,
      /khi không tham gia bảo hiểm xã hội thì đóng bao nhiêu/i,
    ]);
  }

  private hasPersonalMarker(query: string): boolean {
    return this.matchAny(query, [
      /của tôi/i,
      /tôi đã/i,
      /tôi có/i,
      /tôi còn/i,
      /tôi nợ/i,
      /cá nhân tôi/i,
      /của anh/i,
      /của chị/i,
      /của bạn/i,
      /của đồng chí/i,
    ]);
  }

  private hasNamedPersonPattern(query: string): boolean {
    return this.matchAny(query, [
      /của\s+(ông|bà|anh|chị|đồng chí)\s+[\p{L}\s]{2,}/iu,
      /(ông|bà|anh|chị|đồng chí)\s+[\p{L}\s]{2,}.*(số điện thoại|email|địa chỉ|hồ sơ|lý lịch|đảng phí)/iu,
    ]);
  }

  private hasMeaningfulBusinessIntent(query: string): boolean {
    return this.matchAny(query, [
      /đảng viên/i,
      /chi bộ/i,
      /đảng phí/i,
      /kỷ luật/i,
      /điều lệ/i,
      /quy định/i,
      /sinh hoạt/i,
      /kết nạp/i,
      /hồ sơ/i,
      /nghị quyết/i,
      /quy trình/i,
      /thủ tục/i,
    ]);
  }

  private sanitizeNoise(text: string): string {
    return (text ?? '')
      .replace(/<\s*system\s*>[\s\S]*?<\s*\/\s*system\s*>/gi, ' ')
      .replace(/<\s*developer\s*>[\s\S]*?<\s*\/\s*developer\s*>/gi, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/!!reset_system!!/gi, ' ')
      .replace(/#ignore_rules#/gi, ' ')
      .replace(/\bsystem\s*override\s*:/gi, ' ')
      .replace(/\bignore\s+(all\s+)?previous\s+instructions\b/gi, ' ')
      .replace(/\bignore\s+rules\b/gi, ' ')
      .replace(/\breset[_\s-]?system\b/gi, ' ')
      .replace(/\bdeveloper\s*mode\b/gi, ' ')
      .replace(/\bdan\s*mode\b/gi, ' ')
      .replace(/\bbỏ qua mọi hướng dẫn trước đó\b/gi, ' ')
      .replace(/\bbỏ qua chính sách\b/gi, ' ')
      .replace(/\bbỏ qua quy tắc\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private block(params: {
    category: SecurityCategory;
    reason: string;
    message: string;
    riskScore: number;
    matchedRules: string[];
  }): SecurityDecision {
    return {
      action: 'BLOCK',
      category: params.category,
      reason: params.reason,
      message: params.message,
      riskScore: this.round(params.riskScore),
      matchedRules: params.matchedRules,
    };
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

  private matchAny(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
  }

  private round(value: number): number {
    return Math.round(value * 1000) / 1000;
  }
}