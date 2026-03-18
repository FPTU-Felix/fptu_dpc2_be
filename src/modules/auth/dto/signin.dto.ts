import { IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class SigninDto {
  @IsNotEmpty({ message: 'Vui lòng nhập mã nhân viên hoặc email của đồng chí' })
  username: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/, {
    message:
      'Mật khâu phải có ít nhất 6 ký tự, bao gồm cả chữ cái và số, và không chứa khoảng trắng',
  })
  password: string;
}
