import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsUrl } from 'class-validator';
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
    example: 'https:googledrier/giay-cong-tac.pdf',
    description: 'BẮT BUỘC: Link ảnh/tài liệu minh chứng',
  })
  @IsUrl({}, { message: 'Link minh chứng phải là một URL (đường dẫn) hợp lệ' })
  @IsNotEmpty({
    message: 'Bắt buộc phải đính kèm hình ảnh hoặc file minh chứng',
  })
  proofUrl: string;
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
