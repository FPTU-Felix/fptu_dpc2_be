import {
  Controller,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  UploadedFile,
  UseInterceptors,
  Query,
  Get,
  DefaultValuePipe,
  ParseIntPipe,
  ParseUUIDPipe, // 👇 Vũ khí bọc thép
} from '@nestjs/common';
import { AnnualAssessmentsService } from './annual-assessments.service';
import { CreateAnnualAssessmentDto } from './dto/create-annual-assessment.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssessmentStatus, UserRole } from 'src/common/enums';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';
import { ReviewAnnualAssessmentDto } from './dto/review-annual-assessment.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateAnnualAssessmentDto } from './dto/update-annual-assessment.dto';
import { GetClientIp } from '../auth/decorators/get-client-ip.decorator';

@ApiTags('Annual Assessments (Tự đánh giá & Chấm điểm)')
@Controller('annual-assessments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('access-token')
export class AnnualAssessmentsController {
  constructor(private readonly assessmentsService: AnnualAssessmentsService) {}

  @Post('configs')
  @Roles(UserRole.SECRETARY, UserRole.DEPUTY_SECRETARY)
  @ApiOperation({ summary: 'Chi ủy tạo/cập nhật bộ tiêu chí đánh giá cho năm' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        partyCellId: { type: 'string', format: 'uuid' },
        year: { type: 'number', example: 2026 },
        criteriaTemplate: {
          type: 'array',
          items: { type: 'string' },
          example: ['Họp chi bộ đầy đủ', 'Đóng đảng phí', 'Học Nghị quyết'],
        },
      },
    },
  })
  async upsertConfig(
    @GetCurrentUser('sub') actorId: string,
    @GetClientIp() ip: string,
    @Body('partyCellId', ParseUUIDPipe) partyCellId: string,
    @Body('year', ParseIntPipe) year: number,
    @Body('criteriaTemplate') criteriaTemplate: string[],
  ) {
    return await this.assessmentsService.upsertEvaluationConfig(
      partyCellId,
      actorId,
      ip,
      year,
      criteriaTemplate,
    );
  }

  @Get('configs/:partyCellId/:year')
  @Roles(
    UserRole.ADMIN,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
    UserRole.PARTY_MEMBER,
  )
  @ApiOperation({ summary: 'Lấy bộ tiêu chí đánh giá của Chi bộ theo năm' })
  async getConfig(
    @Param('partyCellId', ParseUUIDPipe) partyCellId: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return await this.assessmentsService.getEvaluationConfig(partyCellId, year);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
    UserRole.COMMITTEE_MEMBER,
  )
  @ApiOperation({ summary: 'Lấy danh sách bản tự đánh giá (Phân trang + Lọc)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: AssessmentStatus })
  async getAllAssessments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('year') year?: number,
    @Query('status') status?: AssessmentStatus,
  ) {
    return await this.assessmentsService.findAll(
      { page, limit },
      year ? Number(year) : undefined,
      status,
    );
  }

  @Post('submit')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Đảng viên nộp bản tự đánh giá cuối năm' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async submitAssessment(
    @GetCurrentUser('sub') userId: string,
    @Body() dto: CreateAnnualAssessmentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.assessmentsService.submitAssessment(userId, dto, file);
  }

  @Patch(':id/review')
  @ApiOperation({
    summary: 'Chi ủy duyệt, chấm điểm checklist và chốt xếp loại',
  })
  @Roles(
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  async reviewAssessment(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @GetCurrentUser('sub') userId: string,
    @GetClientIp() ip: string,
    @Body() dto: ReviewAnnualAssessmentDto,
  ) {
    return await this.assessmentsService.reviewAssessment(
      assessmentId,
      userId,
      ip,
      dto,
    );
  }

  @Patch('my-assessments/:year')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Cập nhật bản tự đánh giá của bản thân theo năm' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async updateMyAssessment(
    @GetCurrentUser('sub') userId: string,
    @Param('year', ParseIntPipe) year: number,
    @Body() dto: UpdateAnnualAssessmentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.assessmentsService.updateMyAssessment(
      userId,
      year,
      dto,
      file,
    );
  }

  @Get('my-assessments/:year')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Lấy bản tự đánh giá của bản thân theo năm' })
  async getMyAssessment(
    @GetCurrentUser('sub') userId: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return await this.assessmentsService.getMyAssessmentByYear(userId, year);
  }

  @Get('statistics/:partyCellId/:year')
  @ApiOperation({ summary: 'Thống kê phần trăm xếp loại Đánh giá (Biểu đồ)' })
  async getAssessmentStats(
    @Param('partyCellId') partyCellId: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return await this.assessmentsService.getAssessmentStatistics(
      partyCellId,
      year,
    );
  }
}
