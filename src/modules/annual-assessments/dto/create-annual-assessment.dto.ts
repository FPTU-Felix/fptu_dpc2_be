import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentRank } from 'src/common/enums';

export class CreateAnnualAssessmentDto {
  @ApiProperty({ description: 'Năm đánh giá', example: 2026 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  year: number;

  @ApiProperty({
    enum: AssessmentRank,
    description: 'Mức xếp loại tự nhận',
    example: AssessmentRank.GOOD,
  })
  @IsNotEmpty()
  @IsEnum(AssessmentRank)
  selfRank: AssessmentRank;

  @ApiPropertyOptional({
    description: 'Tự nhận xét ưu khuyết điểm',
    example: 'Tôi đã hoàn thành tốt các nhiệm vụ được giao...',
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File bản kiểm điểm cá nhân (PDF, DOCX...) Bắt buộc đính kèm',
  })
  file: any;
}
