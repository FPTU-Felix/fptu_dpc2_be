import { IsEmail, IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { UserRole } from '../../../common/enums';

export class AdminCreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Username không được để trống' })
  username: string;

  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  @IsNotEmpty({ message: 'roleName không được để trống' })
  roleName: UserRole;
}
