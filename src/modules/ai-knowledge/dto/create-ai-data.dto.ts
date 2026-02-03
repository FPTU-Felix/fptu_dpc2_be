import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAiDataDto {
  @ApiProperty({
    description: 'Tiêu đề của dữ liệu AI',
    example: 'Hướng dẫn sinh hoạt Đảng 2026',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Nội dung chi tiết (văn bản)',
    example: 'Nội dung tóm tắt của nghị quyết...',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Đường dẫn file tài liệu (nếu có)',
    example: 'https://minio.com/bucket/tailieu.pdf',
  })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}
