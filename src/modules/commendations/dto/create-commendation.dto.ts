import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsDateString,
  IsUrl,
  IsOptional,
} from 'class-validator';

export class CreateCommendationDto {
  @ApiProperty({ description: 'ID của Đảng viên được khen thưởng' })
  @IsNotEmpty()
  @IsUUID()
  memberId: string;

  @ApiProperty({
    description: 'Danh hiệu/Hình thức',
    example: 'Đảng viên xuất sắc tiêu biểu',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Ngày ra quyết định (YYYY-MM-DD)',
    example: '2026-11-20',
  })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Số quyết định', example: '456/QĐ-ĐU' })
  @IsNotEmpty()
  @IsString()
  decisionNumber: string;

  @ApiProperty({
    description: 'Cấp ký quyết định',
    example: 'Đảng ủy Khối Doanh nghiệp',
  })
  @IsNotEmpty()
  @IsString()
  signingAuthority: string;

  @ApiPropertyOptional({ description: 'Mô tả thành tích' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Link file scan Quyết định khen thưởng (Bắt buộc)',
  })
  @IsNotEmpty({ message: 'Bắt buộc đính kèm minh chứng khen thưởng' })
  @IsUrl()
  decisionFileUrl: string;
}
