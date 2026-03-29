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
} from '@nestjs/common';
import { AnnualAssessmentsService } from './annual-assessments.service';
import { CreateAnnualAssessmentDto } from './dto/create-annual-assessment.dto';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssessmentStatus, UserRole } from 'src/common/enums';
import { GetCurrentUser } from '../../modules/auth/decorators/get-user.decorator';
import { ReviewAnnualAssessmentDto } from './dto/review-annual-assessment.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateAnnualAssessmentDto } from './dto/update-annual-assessment.dto';

@ApiTags('Annual Assessments (Tự đánh giá hàng năm)')
@Controller('annual-assessments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class AnnualAssessmentsController {
  constructor(private readonly assessmentsService: AnnualAssessmentsService) {}

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

  @Patch(':id')
  @Roles(
    UserRole.PARTY_MEMBER,
    UserRole.COMMITTEE_MEMBER,
    UserRole.SECRETARY,
    UserRole.DEPUTY_SECRETARY,
  )
  @ApiOperation({ summary: 'Cập nhật bản tự đánh giá (Chỉ khi chưa duyệt)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async updateAssessment(
    @Param('id') id: string,
    @GetCurrentUser('sub') userId: string,
    @Body() dto: UpdateAnnualAssessmentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.assessmentsService.updateAssessment(
      id,
      userId,
      dto,
      file,
    );
  }
}
