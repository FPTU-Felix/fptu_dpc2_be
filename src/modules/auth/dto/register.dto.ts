import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Mật khẩu phải dài ít nhất 6 ký tự' })
  password: string;

  @IsOptional()
  roleId?: string; // Để Optional, Frontend không gửi, Backend tự điền
}
