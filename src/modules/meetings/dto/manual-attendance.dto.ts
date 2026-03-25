import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendeeStatus } from 'src/common/enums';

export class AttendanceUpdateItemDto {
  @ApiProperty({
    description: 'ID của Đảng viên',
    example: '8554f812-6d45-4886-89e7-c434ca5e8793',
  })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({
    description: 'Trạng thái điểm danh',
    enum: AttendeeStatus,
    example: AttendeeStatus.PRESENT,
  })
  @IsEnum(AttendeeStatus)
  @IsNotEmpty()
  status: AttendeeStatus;

  @ApiPropertyOptional({
    description: 'Lý do vắng mặt (nếu status là EXCUSED hoặc ABSENT)',
    example: 'Đi công tác đột xuất',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ManualAttendanceDto {
  @ApiProperty({
    description: 'Danh sách trạng thái điểm danh cần cập nhật',
    type: [AttendanceUpdateItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceUpdateItemDto)
  attendances: AttendanceUpdateItemDto[];
}
