import { Injectable } from '@nestjs/common';
import { ToolName } from './query-router.service';

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
  }): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const tool of params.tools) {
      switch (tool) {
        case 'meeting_lookup':
          results.push(await this.lookupMeeting(params.query));
          break;

        case 'organization_lookup':
          results.push(await this.lookupOrganization(params.query));
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

  private async lookupMeeting(query: string): Promise<ToolResult> {
    return {
      tool: 'meeting_lookup',
      success: true,
      data: {
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
      },
      message: 'Đã tìm thấy thông tin cuộc họp phù hợp.',
    };
  }

  private async lookupOrganization(query: string): Promise<ToolResult> {
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
}