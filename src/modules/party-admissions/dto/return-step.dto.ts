import { IsEnum, IsString, MaxLength } from 'class-validator';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { ApiProperty } from '@nestjs/swagger';

export class ReturnStepDto {
  @ApiProperty({ enum: AdmissionWorkflowStep })
  @IsEnum(AdmissionWorkflowStep)
  stepCode: AdmissionWorkflowStep;

  @ApiProperty({
    enum: AdmissionWorkflowStep,
    description: 'Trả về step nào',
  })
  @IsEnum(AdmissionWorkflowStep)
  returnToStepCode: AdmissionWorkflowStep;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason: string;
}
