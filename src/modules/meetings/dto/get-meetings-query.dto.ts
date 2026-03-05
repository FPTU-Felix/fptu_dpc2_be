import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetMeetingsQueryDto {
  @ApiPropertyOptional({ description: 'Tháng (1-12)', example: '2' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ description: 'Năm (VD: 2026)', example: '2026' })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu (Định dạng YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (Định dạng YYYY-MM-DD)',
    example: '2026-03-31',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}
