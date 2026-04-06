import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdmissionOverallStatus } from '../../enum/admission-overall-status';
import { AdmissionWorkflowStep } from '../../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../../enum/admission-workflow-step-status.enum';

export class GetAdmissionApplicationListQueryDto {
  @ApiPropertyOptional({
    description: 'Từ khoá tìm kiếm theo mã hồ sơ hoặc mã/người nộp',
    example: 'PADM-20250115',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    enum: AdmissionOverallStatus,
    description: 'Lọc theo trạng thái tổng thể',
  })
  @IsOptional()
  @IsEnum(AdmissionOverallStatus)
  overallStatus?: AdmissionOverallStatus;

  @ApiPropertyOptional({
    enum: AdmissionWorkflowStep,
    description: 'Lọc theo bước hiện tại',
  })
  @IsOptional()
  @IsEnum(AdmissionWorkflowStep)
  currentStepCode?: AdmissionWorkflowStep;

  @ApiPropertyOptional({
    enum: AdmissionWorkflowStepStatus,
    description: 'Lọc theo trạng thái bước hiện tại',
  })
  @IsOptional()
  @IsEnum(AdmissionWorkflowStepStatus)
  currentStepStatus?: AdmissionWorkflowStepStatus;

  @ApiPropertyOptional({
    description: 'Trang hiện tại',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số bản ghi mỗi trang',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}