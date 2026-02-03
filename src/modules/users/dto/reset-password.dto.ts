import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải từ 8 ký tự' })
  newPassword: string;
}
