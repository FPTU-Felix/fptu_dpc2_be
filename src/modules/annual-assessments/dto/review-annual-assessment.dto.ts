import {
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  Max,
  IsString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssessmentStatus, AssessmentRank } from 'src/common/enums';
import { Type } from 'class-transformer';

export class CriteriaItemDto {
  @ApiProperty({ description: 'Tên tiêu chí' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Đạt hay không đạt' })
  @IsBoolean()
  isChecked: boolean;

  @ApiProperty({ description: 'Ghi chú thêm', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ReviewAnnualAssessmentDto {
  @ApiProperty({
    enum: AssessmentStatus,
    example: AssessmentStatus.APPROVED,
    description: 'Trạng thái sau khi duyệt',
  })
  @IsEnum(AssessmentStatus)
  status: AssessmentStatus;

  @ApiProperty({
    enum: AssessmentRank,
    example: AssessmentRank.GOOD,
    description: 'Mức xếp loại Chi ủy chốt',
  })
  @IsEnum(AssessmentRank)
  finalRank: AssessmentRank;

  @ApiProperty({
    description: 'Điểm số Chi ủy chấm (0 - 100)',
    example: 95,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiProperty({
    type: [CriteriaItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriteriaItemDto)
  criteriaChecklist?: CriteriaItemDto[];
}
