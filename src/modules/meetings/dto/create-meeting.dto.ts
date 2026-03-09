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
// 👇 Nhớ import thêm MeetingFormat từ file enums của ông nhé
import { MeetingType, MeetingFormat } from 'src/common/enums';

export class CreateMeetingDto {
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
    enum: MeetingFormat,
    description: 'Hình thức tổ chức họp (ONLINE hoặc OFFLINE)',
    example: MeetingFormat.ONLINE,
  })
  @IsNotEmpty({ message: 'Vui lòng chọn hình thức họp' })
  @IsEnum(MeetingFormat)
  format: MeetingFormat;

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
    description: 'Địa điểm họp (Bắt buộc nếu họp OFFLINE)',
    example: 'Phòng họp số 1 - Nhà văn hóa',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Link họp Online (Google Meet/Zoom - Bắt buộc nếu họp ONLINE)',
    example: 'https://meet.google.com/abc-xyz-123',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Link họp trực tuyến không đúng định dạng URL' }) // Bật luôn validate URL cho chắc cốp
  onlineLink?: string;

  @ApiPropertyOptional({
    description: 'Nội dung chính / Chương trình họp',
    example: '1. Triển khai nghị quyết tháng mới. 2. Thu đảng phí.',
  })
  @IsOptional()
  @IsString()
  content?: string;
}
