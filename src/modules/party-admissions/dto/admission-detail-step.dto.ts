import { ApiProperty } from '@nestjs/swagger';
import { AdmissionOverallStatus } from '../enum/admission-overall-status';
import { AdmissionStepViewDto } from './admission-view-step.dto';

export class AdmissionApplicationDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  outstandingIndividualId: string;

  @ApiProperty({ enum: AdmissionOverallStatus })
  overallStatus: AdmissionOverallStatus;

  @ApiProperty()
  currentStepCode: string;

  @ApiProperty()
  currentStepStatus: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  submittedAt?: Date;

  @ApiProperty({ required: false })
  approvedAt?: Date;

  @ApiProperty({ required: false })
  rejectedAt?: Date;

  @ApiProperty({ type: [AdmissionStepViewDto] })
  steps: AdmissionStepViewDto[];
}