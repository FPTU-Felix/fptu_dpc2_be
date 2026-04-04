import {
  Body,
  Controller,
  Get,

  Param,

  Post,

  Req,
  UseGuards,

} from '@nestjs/common';
import {
  ApiBearerAuth,

  ApiForbiddenResponse,

  ApiNotFoundResponse,

  ApiOkResponse,

  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { AdmissionApplicationService } from '../services/admission-application.service';
import { MyAdmissionCurrentStatusResponseDto } from '../dto/response/my-admission-current-status.response.dto';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';

@ApiTags('Party Admission - Application')
@ApiBearerAuth('access-token')
@Controller('party-admissions/applications')
export class AdmissionApplicationController {
  constructor(
    private readonly admissionApplicationService: AdmissionApplicationService,
  ) { }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-current-status')
  @ApiOperation({
    summary: 'Lấy toàn bộ trạng thái hồ sơ kết nạp hiện tại của chính tôi',
  })
  @ApiOkResponse({
    description: 'Lấy trạng thái hồ sơ hiện tại thành công',
    type: MyAdmissionCurrentStatusResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Chưa đăng nhập hoặc token không hợp lệ',
  })
  @ApiForbiddenResponse({
    description: 'Không có quyền truy cập API này',
  })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy hồ sơ kết nạp của người dùng hiện tại',
  })
  async getMyCurrentStatus(
    @Req() req: any,
  ): Promise<MyAdmissionCurrentStatusResponseDto> {
    return this.admissionApplicationService.getMyCurrentStatusWithRoleCheck(
      req.user,
    );
  }

  // luu draft
  @UseGuards(AuthGuard('jwt'))
  @Post('my-steps/:stepCode/draft')
  @ApiOperation({
    summary: 'Lưu draft cho bước hiện tại',
  })
  async saveDraftStep(
    @Req() req: any,
    @Param('stepCode') stepCode: AdmissionWorkflowStep,
    @Body() dto: SaveStepDraftDto,
  ) {
    return this.admissionApplicationService.saveDraftStep(
      req.user,
      stepCode,
      dto,
    );
  }

  // submit 
  @UseGuards(AuthGuard('jwt'))
  @Post('my-steps/:stepCode/submit')
  @ApiOperation({
    summary: 'Submit bước hiện tại để chờ review',
  })
  async submitStep(
    @Req() req: any,
    @Param('stepCode') stepCode: AdmissionWorkflowStep,
    @Body() dto: SubmitStepDto,
  ) {
    return this.admissionApplicationService.submitStep(
      req.user,
      stepCode,
      dto,
    );
  }

}
