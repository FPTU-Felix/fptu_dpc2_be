import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Điều lệ Đảng Cộng sản Việt Nam' })
  @IsString({ message: 'Tiêu đề tài liệu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề tài liệu' })
  @MaxLength(500, { message: 'Tiêu đề không được vượt quá 500 ký tự' })
  title: string;

  @ApiProperty({ example: 'dieu-le-dang-cong-san', required: false })
  @IsString({ message: 'Đường dẫn phải là chuỗi ký tự' })
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'Mô tả chi tiết...', required: false })
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'uuid-danh-muc-vua-tao' })
  @IsUUID('all', { message: 'Danh mục tài liệu không hợp lệ (sai định dạng)' })
  @IsNotEmpty({ message: 'Vui lòng chọn danh mục cho tài liệu' })
  categoryId: string;

 @ApiProperty({ example: false, default: false, required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    if (typeof value === 'boolean') {
      return value;
    }
    return false;
  })
  @IsBoolean({ message: 'Trạng thái nổi bật phải là giá trị đúng/sai' })
  isFeatured?: boolean = false;

  @ApiProperty({ type: 'string', format: 'binary' })
  @IsOptional()
  file: any;

  @ApiProperty({ example: 'Chi ủy', required: false })
  @IsString({ message: 'Tên người tải lên phải là chuỗi ký tự' })
  @IsOptional()
  uploadedBy?: string;
}