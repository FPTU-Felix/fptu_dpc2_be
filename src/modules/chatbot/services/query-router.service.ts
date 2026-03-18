import { Injectable } from '@nestjs/common';

export type ChatRouteMode = 'rag' | 'tool' | 'hybrid';

export type ToolName =
  | 'meeting_lookup'
  | 'party_fee_lookup'
  | 'member_profile_lookup'
  | 'organization_lookup';

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
    | 'unknown';
  tools?: ToolName[];
  reason: string;
};

@Injectable()
export class QueryRouterService {
  decide(query: string): RouteDecision {
    const q = this.normalize(query);

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
    ]);

    const hasOrganization = this.hasAny(q, [
      'bí thư là ai',
      'phó bí thư là ai',
      'chi bộ có bao nhiêu đảng viên',
      'ban chi ủy',
      'chi bộ trực thuộc',
      'đảng bộ nào',
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
    ]);

    const needsTool = hasMeeting || hasPartyFee || hasProfile || hasOrganization || (hasPersonal && hasDynamicTime);

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
        reason: 'Câu hỏi vừa cần dữ liệu hệ thống vừa cần tra cứu tài liệu/quy định.',
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
        reason: 'Câu hỏi thiên về quy trình, quy định, biểu mẫu hoặc tài liệu.',
      };
    }

    return {
      mode: 'rag',
      intent: 'unknown',
      reason: 'Không xác định rõ, mặc định tra cứu trong kho tài liệu.',
    };
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
    if (query.includes('hồ sơ') || query.includes('giấy tờ') || query.includes('mẫu')) {
      return 'document_lookup';
    }
    return 'policy_lookup';
  }
}