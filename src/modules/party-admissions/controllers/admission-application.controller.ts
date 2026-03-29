import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from 'src/common/enums';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { AdmissionApplicationService } from '../services/admission-application.service';
import { SubmitApplicationDto } from '../dto/submit-application.dto';
import { ApplicationDetailResponseDto } from '../dto/response/application-detail-response.dto';
import {
  ApiOkResponseData,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from 'src/common/decorators';
import { AdmissionDocumentType } from '../enum/admission-document-type.enum';
import { ApiParam } from '@nestjs/swagger';

@ApiTags('Party Admission - Application')
@ApiBearerAuth('access-token')
@Controller('party-admissions/applications')
export class AdmissionApplicationController {
  constructor(
    private readonly admissionApplicationService: AdmissionApplicationService,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.OUTSTANDING_INDIVIDUAL)
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ kết nạp của cá nhân' })
  @ApiOkResponseData(ApplicationDetailResponseDto, 'Thành công')
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse('Không có quyền truy cập')
  async getMyApplicationDetail(@Req() req: any) {
    const outstandingIndividualId = req.user.sub;
    return await this.admissionApplicationService.getMyApplicationDetail({
      outstandingIndividualId,
    });
  }

  @Post('submit')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.OUTSTANDING_INDIVIDUAL)
  @ApiOperation({ summary: 'Nộp hồ sơ kết nạp Đảng' })
  @ApiBody({ type: SubmitApplicationDto })
  @ApiOkResponseData(ApplicationDetailResponseDto, 'Thành công')
  @ApiBadRequestResponse('Hồ sơ không hợp lệ')
  async submitApplication(
    @Body(new ValidationPipe({ transform: true })) dto: SubmitApplicationDto,
    @Req() req: any,
  ) {
    const outstandingIndividualId = req.user.sub;
    return await this.admissionApplicationService.submitApplicationByUser({
      outstandingIndividualId,
      dto,
    });
  }

  @Post(':applicationId/attachments')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.OUTSTANDING_INDIVIDUAL)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        documentType: {
          type: 'string',
          enum: Object.values(AdmissionDocumentType),
        },
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Tải lên tài liệu đính kèm' })
  @ApiParam({ name: 'applicationId', type: 'string' })
  @ApiOkResponseData(ApplicationDetailResponseDto, 'Tải lên thành công')
  @ApiBadRequestResponse('Dữ liệu không hợp lệ')
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async uploadAttachment(
    @Param('applicationId') applicationId: string,
    @Body('documentType') documentType: AdmissionDocumentType,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const outstandingIndividualId = req.user.sub;
    return await this.admissionApplicationService.uploadApplicationAttachment({
      applicationId,
      outstandingIndividualId,
      file,
      documentType,
    });
  }

  @Get(':applicationId')
  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.OUTSTANDING_INDIVIDUAL, UserRole.COMMITTEE_MEMBER)
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ theo ID' })
  @ApiParam({ name: 'applicationId', type: 'string' })
  @ApiOkResponseData(ApplicationDetailResponseDto, 'Thành công')
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse('Hồ sơ', 'Không tìm thấy')
  async getApplicationDetail(
    @Param('applicationId') applicationId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return await this.admissionApplicationService.getApplicationDetail({
      applicationId,
      userId,
    });
  }
}
