import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UploadMeetingDocumentsDto {
  @ApiProperty({
    description:
      'Danh sách các file biên bản/tài liệu cần tải lên (Tối đa 10 file)',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  @IsOptional()
  files: any[];
}
