import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumberString } from 'class-validator';

export class GetMeetingsQueryDto {
  @ApiPropertyOptional({ description: 'Tháng (1-12)', example: '2' })
  @IsOptional()
  @IsNumberString({}, { message: 'Tháng phải là số' })
  month?: string;

  @ApiPropertyOptional({ description: 'Năm (VD: 2026)', example: '2026' })
  @IsOptional()
  @IsNumberString({}, { message: 'Năm phải là số' })
  year?: string;
}
