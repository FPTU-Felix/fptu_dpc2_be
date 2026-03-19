import { IsOptional, IsString } from 'class-validator';

export class ApproveAdmissionDto {
  @IsOptional()
  @IsString()
  congratulatoryMessage?: string;
}