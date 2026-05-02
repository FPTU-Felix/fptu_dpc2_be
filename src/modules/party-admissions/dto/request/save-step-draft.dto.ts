import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class SaveStepDraftDto {
  @ApiPropertyOptional({
    type: Object,
    example: {
      DON_XIN_VAO_DANG: 'url...',
    },
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, any>;
}
