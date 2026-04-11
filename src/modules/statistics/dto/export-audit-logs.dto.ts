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
  @ApiPropertyOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
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
  year?: string; // Dùng string để nhận từ query rồi parse sau cho an toàn
}

export class ExportFluctuationQueryDto {
  @ApiPropertyOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsString()
  endDate?: string;
}

// Mấy cái Raw này dùng nội bộ trong Service nên ĐỂ NGUYÊN INTERFACE CŨNG ĐƯỢC
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

export interface RawMonthlyFee {
  month: string | number;
  total: string | number;
}
