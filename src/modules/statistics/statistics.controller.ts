import { Controller, Get, Res, Query, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { StatisticsService } from './statistics.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  ExportAssessmentQueryDto,
  ExportAuditLogQueryDto,
  ExportFeeQueryDto,
  ExportFluctuationQueryDto,
  ExportMeetingQueryDto,
  ExportPartyMemberQueryDto,
  ExportReportQueryDto,
} from './dto/export-audit-logs.dto';
import { UserRole } from 'src/common/enums';

@ApiTags('Statistics - Thống kê và Báo cáo')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statsService: StatisticsService) {}

  @ApiOperation({ summary: 'Xuất nhật ký hệ thống (Audit Logs)' })
  @Get('audit-logs/export')
  @Roles(UserRole.ADMIN, UserRole.SECRETARY)
  async exportLogs(
    @Res() res: Response,
    @Query() query: ExportAuditLogQueryDto,
  ) {
    return await this.statsService.exportAuditLogs(res, query);
  }

  @ApiOperation({ summary: 'Xuất danh sách Đảng viên' })
  @Get('party-members/export')
  @Roles(UserRole.ADMIN, UserRole.SECRETARY)
  async exportMembers(
    @Res() res: Response,
    @Query() query: ExportPartyMemberQueryDto,
  ) {
    return await this.statsService.exportPartyMembers(res, query);
  }

  @ApiOperation({ summary: 'Xuất danh sách Khen thưởng' })
  @Get('commendations/export')
  @Roles(UserRole.ADMIN, UserRole.SECRETARY)
  async exportCommendations(
    @Res() res: Response,
    @Query() query: ExportReportQueryDto,
  ) {
    return await this.statsService.exportCommendations(res, query);
  }

  @ApiOperation({ summary: 'Xuất báo cáo Kỷ luật' })
  @Get('disciplines/export')
  @Roles(UserRole.ADMIN, UserRole.SECRETARY)
  async exportDisciplines(
    @Res() res: Response,
    @Query() query: ExportReportQueryDto,
  ) {
    return await this.statsService.exportDisciplines(res, query);
  }

  @ApiOperation({ summary: 'Xuất báo cáo Chuyên cần (Điểm danh)' })
  @Get('meetings/export')
  @Roles(UserRole.ADMIN, UserRole.SECRETARY)
  async exportMeetings(
    @Res() res: Response,
    @Query() query: ExportMeetingQueryDto,
  ) {
    return await this.statsService.exportMeetingAttendance(res, query);
  }

  @ApiOperation({ summary: 'Xuất báo cáo Đánh giá' })
  @Get('assessments/export')
  @Roles(UserRole.ADMIN, UserRole.SECRETARY)
  async exportAssessments(
    @Res() res: Response,
    @Query() query: ExportAssessmentQueryDto,
  ) {
    return await this.statsService.exportAssessments(res, query);
  }

  @ApiOperation({ summary: 'Xuất báo cáo Phí Đảng' })
  @Get('party-fees/export')
  @Roles(UserRole.ADMIN, UserRole.SECRETARY)
  async exportFees(@Res() res: Response, @Query() query: ExportFeeQueryDto) {
    return await this.statsService.exportPartyFees(res, query);
  }

  @ApiOperation({ summary: 'Xuất báo cáo Biến động' })
  @Get('fluctuations/export')
  @Roles(UserRole.ADMIN, UserRole.SECRETARY)
  async exportFluctuations(
    @Res() res: Response,
    @Query() query: ExportFluctuationQueryDto,
  ) {
    return await this.statsService.exportFluctuations(res, query);
  }

  @ApiOperation({ summary: 'Lấy dữ liệu tổng quan cho Dashboard' })
  @Get('dashboard/overview')
  @Roles(UserRole.ADMIN, UserRole.SECRETARY)
  async getDashboardOverview(@Query('year') year?: string) {
    const parsedYear = year ? parseInt(year) : NaN;
    const targetYear =
      !isNaN(parsedYear) && parsedYear > 0
        ? parsedYear
        : new Date().getFullYear();

    return await this.statsService.getDashboardStats(targetYear);
  }
}
