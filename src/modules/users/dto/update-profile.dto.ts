import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { GenderEnum } from 'src/common/enums';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Họ và tên Đảng viên',
    example: 'Nguyễn Văn A',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    enum: GenderEnum,
    description: 'Giới tính',
    example: GenderEnum.MALE,
  })
  @IsOptional()
  @IsEnum(GenderEnum)
  gender?: GenderEnum;

  @ApiPropertyOptional({
    description: 'Ngày sinh (Định dạng: YYYY-MM-DD)',
    example: '1995-05-19',
  })
  @IsOptional()
  @IsDateString()
  dob?: string;

  @ApiPropertyOptional({
    description: 'Quê quán',
    example: 'Hà Nội',
  })
  @IsOptional()
  @IsString()
  hometown?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại (Định dạng VN)',
    example: '0987654321',
  })
  @IsOptional()
  @IsString()
  @IsPhoneNumber('VN')
  phone?: string;

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

  @ApiPropertyOptional({
    description: 'Ngày gia nhập Đảng (Định dạng: YYYY-MM-DD)',
    example: '2020-01-01',
  })
  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày chính thức gia nhập Đảng (Định dạng: YYYY-MM-DD)',
    example: '2020-01-01',
  })
  @IsOptional()
  @IsDateString()
  officialDate?: string;

  @ApiPropertyOptional({
    description: 'Nơi ở hiện tại',
    example: 'Hà Nội',
  })
  @IsOptional()
  @IsString()
  permanentAddress?: string;
}
