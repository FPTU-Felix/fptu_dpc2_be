import { IsEnum, IsString, MaxLength } from 'class-validator';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { ApiProperty } from '@nestjs/swagger';

export class RejectStepDto {
  @ApiProperty({ enum: AdmissionWorkflowStep })
  @IsEnum(AdmissionWorkflowStep)
  stepCode: AdmissionWorkflowStep;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason: string;
}
