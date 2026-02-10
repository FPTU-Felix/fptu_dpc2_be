import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CheckInDto {
  @ApiProperty({
    example: '123456',
    description: 'Mã PIN 6 số hiện trên màn hình',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  pin: string;
}
