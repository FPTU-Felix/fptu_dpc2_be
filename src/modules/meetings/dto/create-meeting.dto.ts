import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsUUID,
  IsUrl,
} from 'class-validator';
import { MeetingType } from 'src/common/enums'; // Import Enum từ Entity

export class CreateMeetingDto {
  // FE cần gửi ID chi bộ lên (hoặc BE tự lấy từ profile user tùy logic ông chọn)
  // Ở đây tôi để FE gửi lên cho linh hoạt
  @ApiProperty({
    description: 'ID của Chi bộ tổ chức cuộc họp',
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @IsNotEmpty()
  @IsUUID()
  partyCellId: string;

  @ApiProperty({
    description: 'Tiêu đề cuộc họp',
    example: 'Sinh hoạt chi bộ thường kỳ tháng 3/2026',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    enum: MeetingType,
    description: 'Loại cuộc họp',
    example: MeetingType.PERIODIC,
  })
  @IsNotEmpty()
  @IsEnum(MeetingType)
  type: MeetingType;

  @ApiProperty({
    description: 'Thời gian bắt đầu (ISO 8601)',
    example: '2026-03-03T08:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({
    description: 'Thời gian kết thúc dự kiến',
    example: '2026-03-03T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Địa điểm họp (nếu họp Offline)',
    example: 'Phòng họp số 1 - Nhà văn hóa',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Link họp Online (Google Meet/Zoom)',
    example: 'https://meet.google.com/abc-xyz-123',
  })
  @IsOptional()
  // @IsUrl() // Có thể bật cái này nếu muốn bắt chặt format URL
  @IsString()
  onlineLink?: string;

  @ApiPropertyOptional({
    description: 'Nội dung chính / Chương trình họp',
    example: '1. Triển khai nghị quyết tháng mới. 2. Thu đảng phí.',
  })
  @IsOptional()
  @IsString()
  content?: string;
}
