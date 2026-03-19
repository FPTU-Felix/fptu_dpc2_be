import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class UpdateMeetingMinutesDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp đường dẫn biên bản.' })
  @IsUrl({}, { message: 'Đường dẫn file biên bản không hợp lệ.' })
  minutesUrl: string; // Đổi lại thành tên cột trong Database của m nhé
}
