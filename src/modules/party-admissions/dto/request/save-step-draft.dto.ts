import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class SaveStepDraftDto {
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
    example: 'Lưu nháp lần 1',
  })
  @IsOptional()
  @IsString()
  note?: string;
}