import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { ApproveStepDto } from '../dto/approve-step.dto';
import { ReturnStepDto } from '../dto/return-step.dto';
import { RejectStepDto } from '../dto/reject-step.dto';
import { SaveStepDraftDto } from '../dto/request/save-step-draft.dto';
import { SubmitStepDto } from '../dto/request/submit-step.dto';
import { GetAdmissionApplicationListQueryDto } from '../dto/response/get-admission-application-list-query.dto';
import { AdmissionApplicationListResponseDto } from '../dto/response/admission-application-list-item.dto';
import { AdmissionApplicationDetailDto } from '../dto/admission-detail-step.dto';
import { MyAdmissionCurrentStatusResponseDto } from '../dto/response/my-admission-current-status.response.dto';
import { AdmissionApplicationService } from '../services/admission-application.service';
import { AuthGuard } from '@nestjs/passport';
import { UseGuards } from '@nestjs/common';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';

@ApiTags('Admission Applications')
@Controller('admission-applications')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('access-token')

export class AdmissionApplicationController {
  constructor(
    private readonly admissionApplicationService: AdmissionApplicationService,
  ) { }

  @Get('my-current-status')
  @ApiOperation({ summary: 'Xem trạng thái hồ sơ hiện tại của QCUT' })
  @ApiResponse({ status: 200, type: MyAdmissionCurrentStatusResponseDto })
  async getMyCurrentStatus(@Req() req: Request) {
    const user = req.user as {
      sub: string;
      username: string;
      roleName: string;
      iat: number;
      exp: number;
    };

    return this.admissionApplicationService.getMyCurrentStatusWithRoleCheck(user);
  }

  @Get()
  @ApiOperation({ summary: 'Xem danh sách tất cả hồ sơ kết nạp' })
  @ApiResponse({ status: 200, type: AdmissionApplicationListResponseDto })
  async getApplicationList(
    @Query() query: GetAdmissionApplicationListQueryDto,
  ) {
    return this.admissionApplicationService.getApplicationList(query);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Xem chi tiết hồ sơ kết nạp' })
  @ApiResponse({ status: 200, type: AdmissionApplicationDetailDto })
  async getApplicationDetail(@Param('id') id: string) {
    return this.admissionApplicationService.getApplicationDetail(id);
  }



  @Post(':stepCode/save-draft')
  @ApiOperation({ summary: 'Lưu nháp dữ liệu của step hiện tại' })
  async saveDraftStep(
    @Param('stepCode') stepCode: string,
    @Body() dto: SaveStepDraftDto,
    @Req() req: Request,
  ) {
    const user = req.user as {
      sub: string;
      role?: { name?: string } | string;
      roleName?: string;
    };

    return this.admissionApplicationService.saveDraftStep(
      user,
      stepCode as any,
      dto,
    );
  }



  @Post(':stepCode/submit')
  @ApiOperation({
    summary:
      'Submit step hiện tại (dành cho QCUT, có 2 bước: gửi đơn lần đầu và xin xác nhận địa phương)',
  })
  async submitStep(
    @Param('stepCode') stepCode: string,
    @Body() dto: SubmitStepDto = {},
    @Req() req: Request,
  ) {
    const user = req.user as {
      sub: string;
      role?: { name?: string } | string;
      roleName?: string;
    };

    return this.admissionApplicationService.submitStep(
      user,
      stepCode as AdmissionWorkflowStep,
      dto,
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Duyệt bước hiện tại' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveStepDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };

    return this.admissionApplicationService.approveStep(id, user.id, dto);
  }

  @Post(':id/resolution-drafting/submit')
  @ApiOperation({ summary: 'Chi uỷ soạn và gửi nghị quyết kết nạp' })
  async submitResolutionDraft(
    @Param('id') applicationId: string,
    @Body() dto: SubmitStepDto,
    @Req() req: Request,
  ) {
    const user = req.user as {
      sub: string;
      role?: { name?: string } | string;
      roleName?: string;
    };

    return this.admissionApplicationService.submitResolutionDraft(
      applicationId,
      user,
      dto,
    );
  }
  @Post(':id/return')
  @ApiOperation({ summary: 'Trả lại hồ sơ' })
  async returnStep(
    @Param('id') id: string,
    @Body() dto: ReturnStepDto,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: string };

    return this.admissionApplicationService.returnStep(id, user.sub, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Từ chối hồ sơ' })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectStepDto,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };

    return this.admissionApplicationService.rejectStep(id, user.id, dto);
  }

  @Get('my-pending')
  @ApiOperation({ summary: 'Danh sách hồ sơ đang chờ cần xử lý (PBT, Chi uỷ, Bí thư)' })
  async getMyPending(
    @Query() query: GetAdmissionApplicationListQueryDto,
    @Req() req: Request,
  ) {
    const user = req.user as {
      sub: string;
      role?: { name?: string } | string;
      roleName?: string;
    };
    return this.admissionApplicationService.getMyPendingApplications(
      user,
      query,
    );
  }
}