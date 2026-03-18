import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  MinLength,
  IsPhoneNumber,
} from 'class-validator';
import { GenderEnum } from 'src/common/enums';

export class CompleteProfileDto {
  @ApiProperty({
    description: 'Họ và tên Đảng viên',
    example: 'Nguyễn Văn A',
  })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName: string;

  @ApiProperty({
    enum: GenderEnum,
    description: 'Giới tính',
    example: GenderEnum.MALE,
  })
  @IsEnum(GenderEnum, { message: 'Giới tính không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng chọn giới tính' })
  gender: GenderEnum;

  @ApiProperty({
    description: 'Ngày sinh (Định dạng: YYYY-MM-DD)',
    example: '1995-05-19',
  })
  @IsDateString(
    {},
    { message: 'Ngày sinh không đúng định dạng ISO (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'Ngày sinh không được để trống' })
  dateOfBirth: string;

  @ApiProperty({
    description: 'Quê quán',
    example: 'Hà Nội',
  })
  @IsString()
  @IsNotEmpty({ message: 'Quê quán không được để trống' })
  hometown: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại (Định dạng VN)',
    example: '0987654321',
  })
  @IsPhoneNumber('VN', {
    message: 'Số điện thoại không đúng định dạng Việt Nam',
  })
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Mật khẩu mới (ít nhất 8 ký tự)',
    example: 'Password123@',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  newPassword: string;

  @ApiProperty({
    description: 'Xác nhận mật khẩu mới',
    example: 'Password123@',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng xác nhận lại mật khẩu' })
  confirmPassword: string;

  @ApiPropertyOptional({
    description: 'Dân tộc (VD: Kinh, Tày, Nùng...)',
    example: 'Kinh',
  })
  @IsOptional()
  @IsString()
  ethnicity?: string;

  @ApiPropertyOptional({
    description: 'Tôn giáo (VD: Không, Phật giáo...)',
    example: 'Không',
  })
  @IsOptional()
  @IsString()
  religion?: string;

  @ApiPropertyOptional({
    description: 'Đối tượng (VD: CBGV, Sinh viên...)',
    example: 'CBGV FPTU',
  })
  @IsOptional()
  @IsString()
  targetGroup?: string;

  @ApiPropertyOptional({
    description: 'Trình độ học vấn (VD: Đại học, Thạc sĩ...)',
    example: 'Thạc sĩ',
  })
  @IsOptional()
  @IsString()
  academicLevel?: string;

  @ApiPropertyOptional({
    description: 'Trình độ lý luận chính trị (VD: Sơ cấp...)',
    example: 'Sơ cấp',
  })
  @IsOptional()
  @IsString()
  politicalTheoryLevel?: string;

  @ApiProperty({
    description: 'ID của Chi bộ mà Đảng viên trực thuộc',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn Chi bộ' })
  partyCellId: string;
}
