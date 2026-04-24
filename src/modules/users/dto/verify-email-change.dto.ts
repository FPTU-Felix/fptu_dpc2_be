import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyEmailChangeDto {
  @ApiProperty({
    description: 'Mã xác nhận gồm 6 ký tự đã được gửi vào email cũ',
    example: 'A1B2C3',
  })
  @IsString({ message: 'Mã xác nhận phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã xác nhận không được để trống' })
  @Length(6, 6, { message: 'Mã xác nhận phải có đúng 6 ký tự' })
  token: string;

  @ApiProperty({
    description: 'Địa chỉ email mới mà đồng chí muốn đổi sang',
    example: 'nguyenvana.new@gmail.com',
  })
  @IsEmail({}, { message: 'Định dạng email mới không hợp lệ' })
  @IsNotEmpty({ message: 'Email mới không được để trống' })
  newEmail: string;
}
