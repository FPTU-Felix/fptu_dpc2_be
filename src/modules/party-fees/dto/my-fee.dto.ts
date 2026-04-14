import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class MyFeeQueryDto {
  @ApiPropertyOptional({ description: 'Năm cần kiểm tra', example: '2026' })
  @IsOptional()
  @IsNumberString()
  year?: string;
}
