import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AdmissionStepCode } from '../enums/admission-step.enum';

export class RequestChangesDto {
  @IsEnum(AdmissionStepCode)
  returnToStep: AdmissionStepCode;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  fieldsToCorrect?: string;
}