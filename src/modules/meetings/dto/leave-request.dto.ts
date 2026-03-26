import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { AttendeeStatus } from 'src/common/enums'; // Sửa đường dẫn nếu cần

export class SubmitLeaveRequestDto {
  @ApiProperty({
    example: 'Về quê có việc gia đình đột xuất',
    description: 'Lý do xin vắng mặt',
  })
  @IsString()
  @IsNotEmpty({ message: 'Lý do không được để trống' })
  reason: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'BẮT BUỘC: File hoặc Ảnh minh chứng (PDF, JPG, PNG...)',
  })
  file: any;
}

export class ReviewLeaveRequestDto {
  @ApiProperty({
    enum: [AttendeeStatus.EXCUSED, AttendeeStatus.ABSENT],
    description:
      'EXCUSED: Duyệt cho nghỉ (Có phép) | ABSENT: Từ chối (Không phép)',
  })
  @IsEnum(AttendeeStatus)
  status: AttendeeStatus;
}
