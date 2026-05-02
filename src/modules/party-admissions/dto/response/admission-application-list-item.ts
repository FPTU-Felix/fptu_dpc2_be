import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdmissionOverallStatus } from '../../enum/admission-overall-status';
import { AdmissionWorkflowStep } from '../../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../../enum/admission-workflow-step-status.enum';

export class AdmissionApplicationListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  outstandingIndividualId: string;

  @ApiPropertyOptional({
    description: 'Tên QCUT/người nộp nếu có join sang bảng user/profile',
    example: 'Nguyễn Văn A',
  })
  outstandingIndividualName?: string;

  @ApiProperty({ enum: AdmissionOverallStatus })
  overallStatus: AdmissionOverallStatus;

  @ApiProperty({ enum: AdmissionWorkflowStep })
  currentStepCode: AdmissionWorkflowStep;

  @ApiProperty({ enum: AdmissionWorkflowStepStatus })
  currentStepStatus: AdmissionWorkflowStepStatus;

  @ApiPropertyOptional({
    description: 'Tên bước hiện tại để frontend hiển thị luôn',
    example: 'PBT duyệt nội dung',
  })
  currentStepName?: string;

  @ApiPropertyOptional({
    description: 'Người/role đang xử lý hiện tại',
    example: 'Đ/c Ngân (PBT)',
  })
  currentHandler?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  submittedAt?: Date;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  rejectedAt?: Date;
}
