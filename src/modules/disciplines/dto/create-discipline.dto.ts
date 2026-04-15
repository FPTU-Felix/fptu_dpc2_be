import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateDisciplineDto {
  @ApiProperty({ description: 'ID của Đảng viên bị kỷ luật' })
  @IsNotEmpty()
  @IsUUID()
  memberId: string;

  @ApiProperty({ description: 'Số quyết định', example: '123/QĐ-ĐU' })
  @IsNotEmpty()
  @IsString()
  decisionNumber: string;

  @ApiProperty({
    description: 'Ngày ra quyết định (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Hình thức kỷ luật', example: 'Cảnh cáo' })
  @IsNotEmpty()
  @IsString()
  form: string;

  @ApiProperty({
    description: 'Lý do kỷ luật',
    example: 'Vi phạm quy định sinh hoạt Đảng',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết thêm (nếu có)' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File scan Quyết định có dấu đỏ (PDF, PNG, JPG)',
  })
  @IsOptional()
  file?: any;
}
