import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdmissionOverallStatus } from '../../enum/admission-overall-status';
import { AdmissionWorkflowStep } from '../../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../../enum/admission-workflow-step-status.enum';
import { AdmissionDocumentType } from '../../enum/admission-document-type.enum';

export class ApplicationResponseDto {
  @ApiProperty({
    description: 'ID hồ sơ',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID cá nhân ưu tú',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  outstandingIndividualId: string;

  @ApiProperty({
    enum: AdmissionOverallStatus,
    description: 'Trạng thái tổng thể của hồ sơ',
  })
  overallStatus: AdmissionOverallStatus;

  @ApiProperty({
    enum: AdmissionWorkflowStep,
    description: 'Bước hiện tại trong quy trình',
  })
  currentStepCode: AdmissionWorkflowStep;

  @ApiProperty({
    enum: AdmissionWorkflowStepStatus,
    description: 'Trạng thái của bước hiện tại',
  })
  currentStepStatus: AdmissionWorkflowStepStatus;

  @ApiProperty({ description: 'Hồ sơ có bị khóa không', example: false })
  isLocked: boolean;

  @ApiPropertyOptional({
    description: 'Thời gian nộp đơn',
    type: String,
    format: 'date-time',
  })
  submittedAt?: Date;

  @ApiPropertyOptional({
    description: 'Thời gian được kết nạp',
    type: String,
    format: 'date-time',
  })
  admittedAt?: Date;

  @ApiPropertyOptional({
    description: 'Thời gian bị từ chối',
    type: String,
    format: 'date-time',
  })
  rejectedAt?: Date;

  @ApiPropertyOptional({ description: 'Lý do trả lại hồ sơ gần nhất' })
  latestReturnReason?: string;

  @ApiPropertyOptional({ description: 'ID người tạo' })
  createdById?: string;

  @ApiPropertyOptional({ description: 'ID người cập nhật cuối' })
  updatedById?: string;

  @ApiProperty({
    description: 'Thời gian tạo',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Thời gian cập nhật',
    type: String,
    format: 'date-time',
  })
  updatedAt: Date;
}

export class StepResponseDto {
  @ApiProperty({
    description: 'ID bước',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  id: string;

  @ApiProperty({
    description: 'ID hồ sơ',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  applicationId: string;

  @ApiProperty({
    enum: AdmissionWorkflowStep,
    description: 'Mã bước trong quy trình',
  })
  stepCode: AdmissionWorkflowStep;

  @ApiProperty({ description: 'Tên bước', example: 'Viết đơn' })
  stepName: string;

  @ApiProperty({ description: 'Thứ tự bước', example: 1 })
  stepOrder: number;

  @ApiProperty({
    enum: AdmissionWorkflowStepStatus,
    description: 'Trạng thái của bước',
  })
  status: AdmissionWorkflowStepStatus;

  @ApiProperty({ description: 'Bước có bị khóa không', example: false })
  isLocked: boolean;

  @ApiProperty({ description: 'Có phải bước hiện tại không', example: true })
  isCurrent: boolean;

  @ApiProperty({ description: 'Đã hoàn thành chưa', example: false })
  isCompleted: boolean;

  @ApiPropertyOptional({
    description: 'Thời gian bắt đầu bước',
    type: String,
    format: 'date-time',
  })
  openedAt?: Date;

  @ApiPropertyOptional({
    description: 'Thời gian nộp bước',
    type: String,
    format: 'date-time',
  })
  submittedAt?: Date;

  @ApiPropertyOptional({
    description: 'Thời gian phê duyệt bước',
    type: String,
    format: 'date-time',
  })
  approvedAt?: Date;

  @ApiPropertyOptional({
    description: 'Thời gian trả lại bước',
    type: String,
    format: 'date-time',
  })
  returnedAt?: Date;

  @ApiPropertyOptional({
    description: 'Thời gian từ chối bước',
    type: String,
    format: 'date-time',
  })
  rejectedAt?: Date;

  @ApiPropertyOptional({ description: 'Lý do trả lại' })
  returnReason?: string;

  @ApiPropertyOptional({ description: 'ID người phê duyệt' })
  approvedById?: string;

  @ApiPropertyOptional({ description: 'ID người trả lại' })
  returnedById?: string;

  @ApiProperty({
    description: 'Thời gian tạo',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Thời gian cập nhật',
    type: String,
    format: 'date-time',
  })
  updatedAt: Date;
}

export class SubmissionResponseDto {
  @ApiProperty({
    description: 'ID submission',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  id: string;

  @ApiProperty({
    description: 'ID hồ sơ',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  applicationId: string;

  @ApiProperty({
    description: 'ID bước',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  stepId: string;

  @ApiProperty({ enum: AdmissionWorkflowStep, description: 'Mã bước' })
  stepCode: AdmissionWorkflowStep;

  @ApiProperty({ description: 'Phiên bản submission', example: 1 })
  version: number;

  @ApiProperty({
    enum: AdmissionWorkflowStepStatus,
    description: 'Trạng thái submission',
  })
  status: AdmissionWorkflowStepStatus;

  @ApiPropertyOptional({ description: 'Dữ liệu form của bước' })
  formData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  note?: string;

  @ApiPropertyOptional({ description: 'ID người nộp' })
  submittedById?: string;

  @ApiPropertyOptional({
    description: 'Thời gian nộp',
    type: String,
    format: 'date-time',
  })
  submittedAt?: Date;

  @ApiProperty({
    description: 'Có phải phiên bản mới nhất không',
    example: true,
  })
  isLatest: boolean;

  @ApiProperty({
    description: 'Thời gian tạo',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;
}

export class DocumentResponseDto {
  @ApiProperty({
    description: 'ID document',
    example: '550e8400-e29b-41d4-a716-446655440004',
  })
  id: string;

  @ApiProperty({
    description: 'ID hồ sơ',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  applicationId: string;

  @ApiPropertyOptional({ description: 'ID bước' })
  stepId?: string;

  @ApiPropertyOptional({ description: 'ID submission' })
  submissionId?: string;

  @ApiProperty({ enum: AdmissionDocumentType, description: 'Loại document' })
  documentType: AdmissionDocumentType;

  @ApiProperty({ description: 'Tên file gốc', example: 'ly_lich.pdf' })
  originalFileName: string;

  @ApiProperty({
    description: 'Tên file lưu trữ',
    example: 'ly_lich_abc123.pdf',
  })
  storedFileName: string;

  @ApiProperty({ description: 'Object key trên MinIO' })
  objectKey: string;

  @ApiPropertyOptional({ description: 'MIME type', example: 'application/pdf' })
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Kích thước file (bytes)',
    example: 1024000,
  })
  size?: number;

  @ApiProperty({ description: 'Phiên bản', example: 1 })
  version: number;

  @ApiProperty({
    description: 'Có phải phiên bản mới nhất không',
    example: true,
  })
  isLatest: boolean;

  @ApiPropertyOptional({ description: 'ID người tải lên' })
  uploadedById?: string;

  @ApiPropertyOptional({
    description: 'Thời gian tải lên',
    type: String,
    format: 'date-time',
  })
  uploadedAt?: Date;

  @ApiProperty({
    description: 'Thời gian tạo',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;
}

export class ApplicationDetailResponseDto {
  @ApiProperty({
    description: 'Thông tin hồ sơ kết nạp',
    type: ApplicationResponseDto,
  })
  application: ApplicationResponseDto;

  @ApiProperty({
    description: 'Danh sách các bước trong quy trình',
    type: [StepResponseDto],
  })
  steps: StepResponseDto[];

  @ApiProperty({
    description: 'Danh sách submissions',
    type: [SubmissionResponseDto],
  })
  submissions: SubmissionResponseDto[];

  @ApiProperty({
    description: 'Danh sách documents đã tải lên',
    type: [DocumentResponseDto],
  })
  documents: DocumentResponseDto[];
}
