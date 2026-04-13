import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { GenderEnum, MemberStatusEnum } from 'src/common/enums';

export class ExportAuditLogQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionType?: string;
}

export class ExportPartyMemberQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partyCellId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class ExportReportQueryDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  quarter?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partyCellId?: string;
}

export class ExportMeetingQueryDto {
  @ApiPropertyOptional({ description: 'Tháng bắt đầu (1-12)', example: '1' })
  @IsOptional()
  @IsNumberString()
  startMonth?: string;

  @ApiPropertyOptional({ description: 'Tháng kết thúc (1-12)', example: '12' })
  @IsOptional()
  @IsNumberString()
  endMonth?: string;

  @ApiPropertyOptional({ description: 'Năm báo cáo', example: '2026' })
  @IsOptional()
  @IsNumberString()
  year?: string;

  @ApiPropertyOptional({ description: 'Lọc theo chi bộ' })
  @IsOptional()
  @IsString()
  partyCellId?: string;
}

export class ExportAssessmentQueryDto {
  @ApiPropertyOptional({ description: 'Năm báo cáo', example: '2026' })
  @IsOptional()
  @IsNumberString()
  year?: string;
}

export class ExportFeeQueryDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  year?: string;
}

export class ExportFluctuationQueryDto {
  @ApiPropertyOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  endDate?: string;
}

export interface RawMeetingAttendance {
  id: string;
  fullname: string;
  cellname: string;
  totalmeetings: string | number;
  presentcount: string | number;
}

export interface RawStatusStat {
  status: MemberStatusEnum;
  value: string | number;
}

export interface RawGenderStat {
  gender: GenderEnum;
  value: string | number;
}

export interface RawMonthlyPaidCount {
  month: string | number;
  paidCount: string | number;
}

export class GetUsersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: string;
}

export class GetLogsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userName?: string; // Tìm theo tên actor
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ description: 'Năm báo cáo', example: '2026' })
  @IsOptional()
  @IsNumberString()
  year?: string;
}
