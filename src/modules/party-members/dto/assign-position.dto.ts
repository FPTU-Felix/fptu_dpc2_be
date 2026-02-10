// src/modules/party-members/dto/assign-position.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';
import { UserRole } from 'src/common/enums'; // Enum ông đã tạo

export class AssignPositionDto {
  @ApiProperty({
    enum: UserRole,
    description: 'Mã chức vụ muốn bổ nhiệm',
    example: UserRole.SECRETARY,
  })
  @IsNotEmpty({ message: 'Chức vụ không được để trống' })
  @IsEnum(UserRole)
  positionCode: UserRole;

  @ApiPropertyOptional({
    description: 'Ngày ra quyết định bổ nhiệm (Mặc định là hôm nay)',
    example: '2026-02-05T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  appointedDate?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú hoặc Số quyết định',
    example: 'Quyết định số 123-QĐ/ĐU',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
