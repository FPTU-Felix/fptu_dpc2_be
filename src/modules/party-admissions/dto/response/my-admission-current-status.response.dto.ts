import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdmissionOverallStatus } from '../../enum/admission-overall-status';
import { AdmissionWorkflowStep } from '../../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../../enum/admission-workflow-step-status.enum';
import { AdmissionReviewAction } from '../../enum/party-admissions.enum';

export class MyAdmissionStepReviewResponseDto {
  @ApiProperty({
    example: '8fd0c2d2-6bd3-4f8c-aacf-7d39f4872ad1',
  })
  id: string;

  @ApiProperty({
    example: 'd6fa1d2f-c7b8-42d4-89ec-cb7e37d9e4a4',
  })
  applicationId: string;

  @ApiProperty({
    example: '3d6d5a77-0f87-4207-b89d-d40b93cb6263',
  })
  stepId: string;

  @ApiPropertyOptional({
    example: '7c61e2e2-4f79-468a-a65e-3b5bcbd8dbff',
    nullable: true,
  })
  submissionId?: string;

  @ApiProperty({
    enum: AdmissionReviewAction,
    example: AdmissionReviewAction.APPROVE,
  })
  action: AdmissionReviewAction;

  @ApiPropertyOptional({
    enum: AdmissionWorkflowStepStatus,
    example: AdmissionWorkflowStepStatus.NOT_STARTED,
    nullable: true,
  })
  fromStatus?: AdmissionWorkflowStepStatus;

  @ApiPropertyOptional({
    enum: AdmissionWorkflowStepStatus,
    example: AdmissionWorkflowStepStatus.COMPLETED,
    nullable: true,
  })
  toStatus?: AdmissionWorkflowStepStatus;

  @ApiPropertyOptional({
    example: 'Hồ sơ hợp lệ',
    nullable: true,
  })
  note?: string;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
  })
  reason?: string;

  @ApiPropertyOptional({
    example: 'aa1fce25-6942-4296-9114-c8b0729b22b1',
    nullable: true,
  })
  reviewerId?: string;

  @ApiPropertyOptional({
    example: '2026-04-04T10:45:00.000Z',
    nullable: true,
  })
  processedAt?: Date;

  @ApiPropertyOptional({
    example: '2026-04-04T10:45:00.000Z',
    nullable: true,
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    example: '2026-04-04T10:45:00.000Z',
    nullable: true,
  })
  updatedAt?: Date;
}

export class MyAdmissionStepSubmissionResponseDto {
  @ApiProperty({
    example: '7c61e2e2-4f79-468a-a65e-3b5bcbd8dbff',
  })
  id: string;

  @ApiProperty({
    example: 'd6fa1d2f-c7b8-42d4-89ec-cb7e37d9e4a4',
  })
  applicationId: string;

  @ApiProperty({
    example: '3d6d5a77-0f87-4207-b89d-d40b93cb6263',
  })
  stepId: string;

  @ApiProperty({
    enum: AdmissionWorkflowStep,
    example: AdmissionWorkflowStep.APPLICATION,
  })
  stepCode: AdmissionWorkflowStep;

  @ApiProperty({
    example: 2,
  })
  version: number;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    example: {
      fullName: 'Nguyen Van A',
      className: 'SE1701',
      studentCode: 'HE170001',
    },
  })
  formData?: Record<string, any>;

  @ApiPropertyOptional({
    example: 'Đã cập nhật đầy đủ biểu mẫu',
    nullable: true,
  })
  note?: string;

  @ApiPropertyOptional({
    example: 'd1b0aa74-08d4-47a2-b917-a283561b8fdb',
    nullable: true,
  })
  submittedById?: string;

  @ApiPropertyOptional({
    example: '2026-04-04T10:30:00.000Z',
    nullable: true,
  })
  submittedAt?: Date;

  @ApiProperty({
    example: true,
  })
  isLatest: boolean;

  @ApiPropertyOptional({
    example: '2026-04-04T10:30:00.000Z',
    nullable: true,
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    example: '2026-04-04T10:30:00.000Z',
    nullable: true,
  })
  updatedAt?: Date;

  @ApiProperty({
    type: () => [MyAdmissionStepReviewResponseDto],
  })
  reviews: MyAdmissionStepReviewResponseDto[];
}

export class MyAdmissionStepResponseDto {
  @ApiProperty({
    example: '3d6d5a77-0f87-4207-b89d-d40b93cb6263',
  })
  id: string;

  @ApiProperty({
    example: 'd6fa1d2f-c7b8-42d4-89ec-cb7e37d9e4a4',
  })
  applicationId: string;

  @ApiProperty({
    enum: AdmissionWorkflowStep,
    example: AdmissionWorkflowStep.APPLICATION,
  })
  stepCode: AdmissionWorkflowStep;

  @ApiProperty({
    example: 'Nộp hồ sơ',
  })
  stepName: string;

  @ApiProperty({
    example: 1,
  })
  stepOrder: number;

  @ApiProperty({
    enum: AdmissionWorkflowStepStatus,
    example: AdmissionWorkflowStepStatus.IN_PROGRESS,
  })
  status: AdmissionWorkflowStepStatus;

  @ApiProperty({
    example: false,
  })
  isLocked: boolean;

  @ApiProperty({
    example: true,
  })
  isCurrent: boolean;

  @ApiProperty({
    example: false,
  })
  isCompleted: boolean;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
  })
  assignedToId?: string;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
  })
  processedById?: string;

  @ApiPropertyOptional({
    example: '2026-04-04T10:00:00.000Z',
    nullable: true,
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    example: '2026-04-04T10:30:00.000Z',
    nullable: true,
  })
  submittedAt?: Date;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
  })
  processedAt?: Date;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
  })
  completedAt?: Date;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
  })
  returnedAt?: Date;

  @ApiPropertyOptional({
    example: 'Đang chờ bổ sung giấy tờ',
    nullable: true,
  })
  note?: string;

  @ApiPropertyOptional({
    example: '2026-04-04T10:00:00.000Z',
    nullable: true,
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    example: '2026-04-04T10:00:00.000Z',
    nullable: true,
  })
  updatedAt?: Date;

  @ApiProperty({
    type: () => [MyAdmissionStepSubmissionResponseDto],
  })
  submissions: MyAdmissionStepSubmissionResponseDto[];

  @ApiProperty({
    type: () => [MyAdmissionStepReviewResponseDto],
  })
  reviews: MyAdmissionStepReviewResponseDto[];
}

export class MyAdmissionCurrentStatusResponseDto {
  @ApiProperty({
    example: 'd6fa1d2f-c7b8-42d4-89ec-cb7e37d9e4a4',
  })
  applicationId: string;

  @ApiProperty({
    example: 'PA-2026-0001',
  })
  code: string;

  @ApiProperty({
    example: 'd1b0aa74-08d4-47a2-b917-a283561b8fdb',
  })
  outstandingIndividualId: string;

  @ApiProperty({
    enum: AdmissionOverallStatus,
    example: AdmissionOverallStatus.IN_PROGRESS,
  })
  overallStatus: AdmissionOverallStatus;

  @ApiProperty({
    enum: AdmissionWorkflowStep,
    example: AdmissionWorkflowStep.APPLICATION,
  })
  currentStepCode: AdmissionWorkflowStep;

  @ApiProperty({
    enum: AdmissionWorkflowStepStatus,
    example: AdmissionWorkflowStepStatus.IN_PROGRESS,
  })
  currentStepStatus: AdmissionWorkflowStepStatus;

  @ApiProperty({
    example: false,
  })
  isLocked: boolean;

  @ApiProperty({
    example: '2026-04-04T09:50:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    type: () => MyAdmissionStepResponseDto,
    nullable: true,
  })
  currentStep: MyAdmissionStepResponseDto | null;

  @ApiProperty({
    type: () => [MyAdmissionStepResponseDto],
  })
  steps: MyAdmissionStepResponseDto[];
}
