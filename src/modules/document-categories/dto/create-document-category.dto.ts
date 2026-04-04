import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsInt } from 'class-validator';

export class CreateDocumentCategoryDto {
  @ApiProperty({ example: 'Điều lệ Đảng', description: 'Tên danh mục' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'dieu-le-dang', description: 'Đường dẫn định danh duy nhất' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  @ApiProperty({ example: 'Điều lệ và quy định của Đảng', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '#D32F2F', default: '#D32F2F', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'book-open', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: 1, default: 0, required: false })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}