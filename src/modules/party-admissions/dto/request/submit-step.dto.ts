import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class SubmitStepDto {
  @ApiPropertyOptional({
    type: Object,
    example: {
      fullName: 'Nguyen Van A',
      studentCode: 'HE170001',
      className: 'SE1701',
    },
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'Em đã hoàn thiện hồ sơ và gửi lên để review',
  })
  @IsOptional()
  @IsString()
  note?: string;
}