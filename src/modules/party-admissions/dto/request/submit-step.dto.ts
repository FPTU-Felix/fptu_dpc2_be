import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class SubmitStepDto {
  @ApiPropertyOptional({
    type: Object,
    example: {
      DON_XIN_VAO_DANG: 'url-1',
      LY_LICH_NGUOI_XIN_VAO_DANG: 'url-2',
      GIAY_GIOI_THIEU_DANG_VIEN_1: 'url-3',
      GIAY_GIOI_THIEU_DANG_VIEN_2: 'url-4',
    },
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, any>;
}