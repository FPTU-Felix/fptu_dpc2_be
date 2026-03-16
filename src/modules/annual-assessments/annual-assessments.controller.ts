import {
  Controller,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
} from '@nestjs/common';
import { AnnualAssessmentsService } from './annual-assessments.service';
import { CreateAnnualAssessmentDto } from './dto/create-annual-assessment.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';
import { ReviewAnnualAssessmentDto } from './dto/review-annual-assessment.dto';

@ApiTags('Annual Assessments (Tự đánh giá hàng năm)')
@Controller('annual-assessments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class AnnualAssessmentsController {
  constructor(private readonly assessmentsService: AnnualAssessmentsService) {}

  @Post('submit')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Đảng viên nộp bản tự đánh giá cuối năm' })
  async submitAssessment(
    @GetCurrentUser('sub') userId: string,
    @Body() dto: CreateAnnualAssessmentDto,
  ) {
    return await this.assessmentsService.submitAssessment(userId, dto);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Chi ủy duyệt và chốt mức xếp loại cuối năm' })
  @Roles(
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  async reviewAssessment(
    @Param('id') assessmentId: string,
    @GetCurrentUser('sub') userId: string,
    @Body() dto: ReviewAnnualAssessmentDto,
  ) {
    return await this.assessmentsService.reviewAssessment(
      assessmentId,
      userId,
      dto,
    );
  }
}
