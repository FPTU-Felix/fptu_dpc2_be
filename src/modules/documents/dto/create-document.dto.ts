import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Điều lệ Đảng 2024' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Mô tả ngắn...', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'uuid-danh-muc' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: false, default: false })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  // QUAN TRỌNG: Thêm @IsOptional() ở đây
  @ApiProperty({ type: 'string', format: 'binary' })
  @IsOptional() 
  file: any;

  @ApiProperty({ example: 'Chi ủy', required: false, default: 'Chi ủy' })
@IsString()
@IsOptional()
uploadedBy?: string; // Thêm trường này vào
}