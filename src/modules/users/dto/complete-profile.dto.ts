import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  MinLength,
  IsPhoneNumber,
} from 'class-validator';
import { GenderEnum } from 'src/modules/party-members/entities/party-member.entity';

export class CompleteProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName: string;

  @IsEnum(GenderEnum, { message: 'Giới tính không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng chọn giới tính' })
  gender: GenderEnum;

  @IsDateString(
    {},
    { message: 'Ngày sinh không đúng định dạng ISO (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty({ message: 'Quê quán không được để trống' })
  hometown: string;

  @IsPhoneNumber('VN', {
    message: 'Số điện thoại không đúng định dạng Việt Nam',
  })
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận lại mật khẩu' })
  confirmPassword: string;
}
