import { Injectable } from '@nestjs/common';
import { ToolName } from './query-router.service';
import { UserRole } from './prompt-defense.service';

export type ToolResult = {
  tool: ToolName;
  success: boolean;
  data: any;
  message?: string;
};

@Injectable()
export class ChatbotToolService {
  async executeTools(params: {
    query: string;
    tools: ToolName[];
    userId?: string;
    userRole?: UserRole;
  }): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const tool of params.tools) {
      switch (tool) {
        case 'meeting_lookup':
          results.push(await this.lookupMeeting(params.query, params.userId));
          break;

        case 'party_fee_lookup':
          results.push(
            await this.lookupPartyFee(
              params.query,
              params.userId,
              params.userRole,
            ),
          );
          break;

        case 'member_profile_lookup':
          results.push(
            await this.lookupMemberProfile(
              params.query,
              params.userId,
              params.userRole,
            ),
          );
          break;

        case 'organization_lookup':
          results.push(
            await this.lookupOrganization(params.query, params.userId),
          );
          break;

        default:
          results.push({
            tool,
            success: false,
            data: null,
            message: 'Tool chưa được hỗ trợ.',
          });
      }
    }

    return results;
  }

  private async lookupMeeting(
    query: string,
    userId?: string,
  ): Promise<ToolResult> {
    return {
      tool: 'meeting_lookup',
      success: true,
      data: {
        meetingId: 'MTG-2026-05',
        title: 'Sinh hoạt chi bộ định kỳ tháng 6',
        date: '2026-06-20',
        time: '09:00',
        location: 'Phòng họp tầng 7 - Tòa nhà FPT',
        organizer: 'Chi bộ Khối Giáo dục 2',
        agenda: [
          'Tổng kết hoạt động tháng trước',
          'Thảo luận công tác phát triển đảng viên mới',
          'Triển khai nhiệm vụ tháng tới',
        ],
        participantsCount: 18,
      },
      message: 'Đã tìm thấy thông tin buổi họp phù hợp.',
    };
  }

  private async lookupPartyFee(
    query: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<ToolResult> {
    const askOwnFee =
      query.toLowerCase().includes('đảng phí của tôi') ||
      query.toLowerCase().includes('tôi đóng đảng phí') ||
      query.toLowerCase().includes('đảng phí tôi');

    if (!askOwnFee && !this.isPrivilegedRole(userRole)) {
      return {
        tool: 'party_fee_lookup',
        success: false,
        data: null,
        message:
          'Bạn không có quyền xem thông tin đảng phí của người khác hoặc dữ liệu tài chính tổng hợp nhạy cảm.',
      };
    }

    return {
      tool: 'party_fee_lookup',
      success: true,
      data: {
        memberId: userId ?? 'MEM-102',
        memberName: 'Nguyễn Văn A',
        status: 'PAID',
        lastPaidMonth: '2026-05',
        pendingMonths: [],
        paymentHistory: [
          { month: '2026-05', amount: 200000 },
          { month: '2026-04', amount: 200000 },
          { month: '2026-03', amount: 200000 },
        ],
      },
      message: 'Đảng phí đã được tra cứu theo phạm vi quyền hiện tại.',
    };
  }

  private async lookupMemberProfile(
    query: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<ToolResult> {
    const normalized = query.toLowerCase();
    const askOwnProfile =
      normalized.includes('hồ sơ của tôi') ||
      normalized.includes('lý lịch của tôi') ||
      normalized.includes('trạng thái hồ sơ của tôi') ||
      normalized.includes('tôi là đảng viên');

    if (!askOwnProfile && !this.isPrivilegedRole(userRole)) {
      return {
        tool: 'member_profile_lookup',
        success: false,
        data: null,
        message:
          'Bạn không có quyền xem hồ sơ cá nhân chi tiết của người khác.',
      };
    }

    return {
      tool: 'member_profile_lookup',
      success: true,
      data: {
        memberId: userId ?? 'MEM-102',
        name: 'Nguyễn Văn A',
        role: 'Đảng viên dự bị',
        partyCell: 'Chi bộ Khối Giáo dục 2',
        joinedDate: '2025-09-15',
        mentor: ['Trần Văn B', 'Lê Thị C'],
        status: 'ACTIVE',
      },
      message: 'Đã tìm thấy thông tin hồ sơ trong phạm vi được phép.',
    };
  }

  private async lookupOrganization(
    query: string,
    userId?: string,
  ): Promise<ToolResult> {
    return {
      tool: 'organization_lookup',
      success: true,
      data: {
        partyCell: 'Chi bộ Khối Giáo dục 2',
        secretary: 'Nguyễn Minh Hùng',
        deputySecretary: 'Phạm Thu Trang',
        memberCount: 22,
        parentOrganization: 'Đảng bộ Khối Giáo dục FPT Hà Nội',
      },
      message: 'Đã tìm thấy thông tin tổ chức.',
    };
  }

  private isPrivilegedRole(role?: UserRole): boolean {
    return (
      role === 'SUPER_ADMIN' ||
      role === 'ADMIN' ||
      role === 'SECRETARY' ||
      role === 'DEPUTY_SECRETARY' ||
      role === 'COMMITTEE'
    );
  }
}