import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsUUID,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class GetPartyFeesDto {
  @ApiProperty({ description: 'ID của Chi bộ' })
  @IsUUID()
  @IsNotEmpty()
  partyCellId: string;

  @ApiProperty({ description: 'Tháng cần xem' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ description: 'Năm cần xem' })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year: number;

  @ApiPropertyOptional({ description: 'Trang hiện tại', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Số bản ghi trên trang', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
