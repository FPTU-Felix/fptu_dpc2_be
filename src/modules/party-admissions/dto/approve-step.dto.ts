import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveStepDto {
  @ApiProperty({ enum: AdmissionWorkflowStep })
  @IsEnum(AdmissionWorkflowStep)
  stepCode: AdmissionWorkflowStep;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}