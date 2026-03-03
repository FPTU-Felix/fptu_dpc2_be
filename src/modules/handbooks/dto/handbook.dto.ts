import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

// ==========================================
// DTO CHO HANDBOOK (CHỦ ĐỀ CẨM NANG)
// ==========================================

export class CreateHandbookDto {
  @ApiProperty({
    example: 'Sổ tay nghiệp vụ công tác Đảng năm 2026',
    description: 'Tiêu đề của Cẩm nang/Sổ tay',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @ApiProperty({
    example:
      'Tập hợp các quy định, hướng dẫn mới nhất về sinh hoạt Chi bộ và đóng Đảng phí áp dụng từ tháng 3/2026.',
    description: 'Mô tả chi tiết nội dung Cẩm nang',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Trạng thái hiển thị (true = Hiện, false = Ẩn)',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// PartialType sẽ tự động kế thừa toàn bộ @ApiProperty (kể cả example) từ Create qua
export class UpdateHandbookDto extends PartialType(CreateHandbookDto) {}

// ==========================================
// DTO CHO HANDBOOK LINKS (ĐƯỜNG DẪN TÀI LIỆU)
// ==========================================

export class CreateHandbookLinkDto {
  @ApiProperty({
    example: 'Hướng dẫn thu, nộp và quản lý Đảng phí',
    description: 'Tên của tài liệu/đường dẫn con',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên tài liệu không được để trống' })
  title: string;

  @ApiProperty({
    example: 'https://hcmuni.fpt.edu.vn/tai-lieu/huong-dan-dang-phi-2026.pdf',
    description:
      'Đường dẫn URL trỏ tới file tài liệu (PDF, Word) hoặc trang web',
  })
  @IsUrl(
    {},
    {
      message:
        'Đường dẫn (URL) không hợp lệ, phải bắt đầu bằng http:// hoặc https://',
    },
  )
  @IsNotEmpty({ message: 'URL không được để trống' })
  url: string;
}

export class UpdateHandbookLinkDto extends PartialType(CreateHandbookLinkDto) {}
