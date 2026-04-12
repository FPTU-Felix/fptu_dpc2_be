import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Điều lệ Đảng Cộng sản Việt Nam' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty({ example: 'dieu-le-dang-cong-san', required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'Mô tả chi tiết...', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'uuid-danh-muc-vua-tao' })
  @IsUUID() // Kiểm tra định dạng UUID
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: false, default: false, required: false }) 
  @IsOptional()
  @Transform(({ value }) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return false; 
  })
  @IsBoolean()
  isFeatured?: boolean = false; // Gán giá trị mặc định ngay tại đây

  @ApiProperty({ type: 'string', format: 'binary' })
  @IsOptional() 
  file: any;

  @ApiProperty({ example: 'Chi ủy', required: false })
  @IsString()
  @IsOptional()
  uploadedBy?: string;
}