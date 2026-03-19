import { IsString } from 'class-validator';

export class RejectAdmissionDto {
  @IsString()
  reason: string;
}