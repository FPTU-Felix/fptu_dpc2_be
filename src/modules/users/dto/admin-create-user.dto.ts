import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AdminCreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Username không được để trống' })
  username: string;

  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsUUID('4', { message: 'RoleId phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'RoleId không được để trống' })
  roleId: string;
}
