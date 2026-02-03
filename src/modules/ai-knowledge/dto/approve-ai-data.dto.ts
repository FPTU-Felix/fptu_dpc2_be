import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AiDataStatus } from 'src/common/enums';

export class ApproveAiDataDto {
  @ApiProperty({
    enum: AiDataStatus,
    example: AiDataStatus.APPROVED,
    description: 'Trạng thái duyệt',
  })
  @IsEnum(AiDataStatus)
  status: AiDataStatus;

  @ApiPropertyOptional({
    description: 'Lý do từ chối (nếu có)',
    example: 'Tài liệu không đúng định dạng quy định',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
