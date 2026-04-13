import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsInt } from 'class-validator';

export class CreateDocumentCategoryDto {
  @ApiProperty({ example: 'Điều lệ Đảng', description: 'Tên danh mục' })
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên danh mục' })
  @MaxLength(255, { message: 'Tên danh mục không được vượt quá 255 ký tự' })
  name: string;

  @ApiProperty({ example: 'dieu-le-dang', description: 'Đường dẫn định danh duy nhất' })
  @IsString({ message: 'Đường dẫn phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập đường dẫn định danh ' })
  @MaxLength(255, { message: 'Đường dẫn không được vượt quá 255 ký tự' })
  slug: string;

  @ApiProperty({ example: 'Điều lệ và quy định của Đảng', required: false, description: 'Mô tả danh mục' })
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '#D32F2F', default: '#D32F2F', required: false, description: 'Mã màu hiển thị' })
  @IsString({ message: 'Mã màu phải là chuỗi ký tự' })
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'book-open', required: false, description: 'Icon hiển thị' })
  @IsString({ message: 'Icon phải là chuỗi ký tự' })
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: 1, default: 0, required: false, description: 'Thứ tự sắp xếp' })
  @IsInt({ message: 'Thứ tự sắp xếp phải là số nguyên' })
  @IsOptional()
  sortOrder?: number;
}