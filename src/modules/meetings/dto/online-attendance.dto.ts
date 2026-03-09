import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class OnlineAttendanceDto {
  @ApiProperty({
    example: 'https://meet.google.com/abc-defg-hij?authuser=0',
    description: 'Bắt buộc gửi URL hiện tại để BE chống gian lận đổi link',
  })
  @IsString()
  @IsNotEmpty()
  currentUrl: string;
}
