import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendeeStatus } from 'src/common/enums';

export class AttendanceUpdateItemDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsEnum(AttendeeStatus)
  @IsNotEmpty()
  status: AttendeeStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ManualAttendanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceUpdateItemDto)
  attendances: AttendanceUpdateItemDto[];
}
