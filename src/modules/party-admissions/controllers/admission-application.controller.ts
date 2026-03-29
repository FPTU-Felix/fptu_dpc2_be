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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AdmissionApplicationService } from '../services/admission-application.service';
import { CreateApplicationDraftDto } from '../dto/create-application-draft.dto';
import { UpdateApplicationDraftDto } from '../dto/update-application-draft.dto';
import { SubmitApplicationDto } from '../dto/submit-application.dto';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from 'src/common/enums';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';

@ApiTags('Party Admission - Application')
@Controller('party-admissions/applications')
export class AdmissionApplicationController {
  constructor(
    private readonly admissionApplicationService: AdmissionApplicationService,
  ) {}

  /**
   * Demo: tạm truyền candidateUserId + partyCellId qua body.
   * Sau này đổi sang lấy từ JWT/current user.
   */
  //   @UseGuards(AuthGuard('jwt'))
  //   @Roles(UserRole.OUTSTANDING_INDIVIDUAL)
  //   @Post('draft')
  //   async createDraft(
  //     @Body()
  //     body: CreateApplicationDraftDto & {
  //       candidateUserId: string;
  //       partyCellId: string;
  //     },
  //   ) {
  //     const { candidateUserId, partyCellId, ...dto } = body;

  //     return await this.admissionApplicationService.createDraft({
  //       candidateUserId,
  //       partyCellId,
  //       dto,
  //     });
  //   }

  //   @Patch(':applicationId/draft')
  //   async updateDraft(
  //     @Param('applicationId') applicationId: string,
  //     @Body()
  //     body: UpdateApplicationDraftDto & {
  //       candidateUserId: string;
  //     },
  //   ) {
  //     const { candidateUserId, ...dto } = body;

  //     return await this.admissionApplicationService.updateDraft({
  //       applicationId,
  //       candidateUserId,
  //       dto,
  //     });
  //   }

  //   @Post(':applicationId/submit')
  //   async submitApplication(
  //     @Param('applicationId') applicationId: string,
  //     @Body()
  //     body: SubmitApplicationDto & {
  //       candidateUserId: string;
  //     },
  //   ) {
  //     const { candidateUserId, ...dto } = body;

  //     return await this.admissionApplicationService.submitApplication({
  //       applicationId,
  //       candidateUserId,
  //       dto,
  //     });
  //   }

  //   @Post(':applicationId/attachments')
  //   @ApiConsumes('multipart/form-data')
  //   @ApiBody({
  //     schema: {
  //       type: 'object',
  //       properties: {
  //         candidateUserId: {
  //           type: 'string',
  //         },
  //         file: {
  //           type: 'string',
  //           format: 'binary',
  //         },
  //       },
  //       required: ['candidateUserId', 'file'],
  //     },
  //   })
  //   @UseInterceptors(FileInterceptor('file'))
  //   async uploadAttachment(
  //     @Param('applicationId') applicationId: string,
  //     @Body('candidateUserId') candidateUserId: string,
  //     @UploadedFile() file: Express.Multer.File,
  //   ) {
  //     return await this.admissionApplicationService.uploadApplicationAttachment({
  //       applicationId,
  //       candidateUserId,
  //       file,
  //     });
  //   }

  @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.OUTSTANDING_INDIVIDUAL)
  @Get('me')
  async getMyApplicationDetail(@Req() req: any) {
    const outstandingIndividualId = req.user.userId;

    return await this.admissionApplicationService.getMyApplicationDetail({
      outstandingIndividualId,
    });
  }
}
