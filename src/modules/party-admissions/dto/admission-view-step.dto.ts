import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class AdmissionStepViewDto {
  @ApiProperty()
  stepCode: AdmissionWorkflowStep;

  @ApiProperty()
  stepName: string;

  @ApiProperty()
  stepOrder: number;

  @ApiProperty({ enum: AdmissionWorkflowStepStatus })
  status: AdmissionWorkflowStepStatus;

  @ApiProperty()
  isCurrent: boolean;

  @ApiProperty()
  isLocked: boolean;

  @ApiProperty({ required: false })
  startedAt?: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ required: false })
  note?: string;

  /**
   * Người xử lý step (Chi uỷ, PBT, BT...)
   */
  @ApiProperty({ required: false })
  handledBy?: string;

  /**
   * Data của step (QCUT nhập, verification, resolution...)
   */
  @ApiProperty({ type: Object, required: false })
  data?: Record<string, any>;
}
