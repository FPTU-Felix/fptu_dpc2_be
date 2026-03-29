import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentRank } from 'src/common/enums';

export class UpdateAnnualAssessmentDto {
  @ApiPropertyOptional({ description: 'Năm đánh giá', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({
    enum: AssessmentRank,
    description: 'Mức xếp loại tự nhận',
  })
  @IsOptional()
  @IsEnum(AssessmentRank)
  selfRank?: AssessmentRank;

  @ApiPropertyOptional({
    description: 'Tự nhận xét ưu khuyết điểm',
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description:
      'File bản kiểm điểm cá nhân mới (Nếu không chọn sẽ giữ nguyên file cũ)',
  })
  file?: any;
}
