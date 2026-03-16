import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsString,
  IsUrl,
  IsOptional,
} from 'class-validator';
import { AssessmentRank } from 'src/common/enums';

export class CreateAnnualAssessmentDto {
  @ApiProperty({ description: 'Năm đánh giá', example: 2026 })
  @IsNotEmpty()
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
    description: 'Link file bản kiểm điểm cá nhân (Bắt buộc)',
    example: 'https://storage.googleapis.com/.../kiem-diem-2026.pdf',
  })
  @IsNotEmpty({ message: 'Bắt buộc phải đính kèm bản kiểm điểm cá nhân' })
  @IsUrl()
  assessmentFileUrl: string;
}
