import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  Min,
  IsInt,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ArticleStatus } from '../entities/handbook-article.entity';

// ==========================================
// DTO CHO CHUYÊN MỤC (CATEGORY)
// ==========================================
export class CreateCategoryDto {
  @ApiProperty({ description: 'Tên chuyên mục', example: 'Gương điển hình' })
  @IsString()
  @IsNotEmpty({ message: 'Tên chuyên mục không được để trống' })
  name: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

// ==========================================
// DTO CHO BÀI VIẾT (ARTICLE)
// ==========================================
export class CreateArticleDto {
  @ApiProperty({ description: 'Tiêu đề bài viết' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @ApiProperty({ description: 'Mô tả ngắn', required: false })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiProperty({ description: 'Nội dung bài viết (HTML)' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: string;

  @ApiProperty({ description: 'Tên tác giả', required: false })
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiProperty({ enum: ArticleStatus, default: ArticleStatus.DRAFT })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiProperty({ description: 'Ghim bài viết lên đầu', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPinned?: boolean;

  @ApiProperty({ description: 'Đánh dấu bài viết nổi bật', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isHighlighted?: boolean;

  @ApiProperty({ description: 'ID của Chuyên mục', required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Ảnh bìa (Thumbnail)',
  })
  @IsOptional()
  file?: any;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}

// ==========================================
// DTO CHO BỘ LỌC (FILTER)
// ==========================================
export class ArticleFilterDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ required: false, description: 'Tìm kiếm theo tiêu đề' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPinned?: boolean;
}
