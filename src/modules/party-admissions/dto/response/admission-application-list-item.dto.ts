import { ApiProperty } from '@nestjs/swagger';
import { AdmissionApplicationListItemDto } from './admission-application-list-item';

export class AdmissionApplicationListResponseDto {
  @ApiProperty({ type: [AdmissionApplicationListItemDto] })
  items: AdmissionApplicationListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}