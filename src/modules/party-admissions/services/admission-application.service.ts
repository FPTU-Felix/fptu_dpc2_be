import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartyAdmissionApplicationEntity } from '../entities/party-admission-application.entity';
import { PartyAdmissionStepEntity } from '../entities/party-admission-step.entity';
import { PartyAdmissionStepSubmissionEntity } from '../entities/party-admission-step-submission.entity';
import { PartyAdmissionDocumentEntity } from '../entities/party-admission-document.entity';
import { MinioService } from 'src/modules/minio/minio.service';

import { AdmissionLogAction } from '../enum/admission-log-action.enum';
import { UpdateApplicationDraftDto } from '../dto/update-application-draft.dto';
import { AdmissionDocumentType } from '../enum/admission-document-type.enum';
import { SubmitApplicationDto } from '../dto/submit-application.dto';
import { AdmissionWorkflowLogService } from './admission-workflow-log.service';
import { CreateApplicationDraftDto } from '../dto/create-application-draft.dto';
import { AdmissionOverallStatus } from '../enum/admission-overall-status';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';

@Injectable()
export class AdmissionApplicationService {
  constructor(
    @InjectRepository(PartyAdmissionApplicationEntity)
    private readonly applicationRepo: Repository<PartyAdmissionApplicationEntity>,

    @InjectRepository(PartyAdmissionStepEntity)
    private readonly stepRepo: Repository<PartyAdmissionStepEntity>,

    @InjectRepository(PartyAdmissionStepSubmissionEntity)
    private readonly submissionRepo: Repository<PartyAdmissionStepSubmissionEntity>,

    @InjectRepository(PartyAdmissionDocumentEntity)
    private readonly documentRepo: Repository<PartyAdmissionDocumentEntity>,

    private readonly minioService: MinioService,
    private readonly workflowLogService: AdmissionWorkflowLogService,
  ) {}

  private getStepName(stepCode: AdmissionWorkflowStep): string {
    switch (stepCode) {
      case AdmissionWorkflowStep.DRAFT:
        return 'Bản nháp';
      case AdmissionWorkflowStep.APPLICATION_SUBMISSION:
        return 'Nộp hồ sơ';
      case AdmissionWorkflowStep.CHI_UY_REVIEW:
        return 'Chi ủy kiểm tra';
      case AdmissionWorkflowStep.PBT_CONTENT_REVIEW:
        return 'PBT duyệt nội dung';
      case AdmissionWorkflowStep.LOCAL_VERIFICATION:
        return 'Xác minh lý lịch';
      case AdmissionWorkflowStep.RED_SEAL_CHECK:
        return 'Kiểm tra dấu đỏ';
      case AdmissionWorkflowStep.RESOLUTION_DRAFTING:
        return 'Soạn nghị quyết';
      case AdmissionWorkflowStep.SECRETARY_RESOLUTION_REVIEW:
        return 'Bí thư duyệt nghị quyết';
      case AdmissionWorkflowStep.COMPLETED:
        return 'Hoàn thành';
      default:
        return stepCode;
    }
  }

  async uploadApplicationAttachment(params: {
    applicationId: string;
    outstandingIndividualId: string;
    file: Express.Multer.File;
    documentType?: AdmissionDocumentType;
  }) {
    const { applicationId, outstandingIndividualId, file, documentType } =
      params;

    if (!file) {
      throw new BadRequestException('Vui lòng chọn file');
    }

    const application = await this.applicationRepo.findOne({
      where: {
        id: applicationId,
        outstandingIndividualId,
      },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy hồ sơ kết nạp');
    }

    if (
      ![AdmissionOverallStatus.DRAFT, AdmissionOverallStatus.RETURNED].includes(
        application.overallStatus,
      )
    ) {
      throw new BadRequestException(
        'Không thể tải thêm file sau khi đã gửi duyệt',
      );
    }

    const step = await this.stepRepo.findOne({
      where: {
        applicationId,
        stepCode: AdmissionWorkflowStep.APPLICATION_SUBMISSION,
      },
    });

    if (!step) {
      throw new NotFoundException('Không tìm thấy bước nộp hồ sơ');
    }

    const submission = await this.submissionRepo.findOne({
      where: {
        applicationId,
        stepId: step.id,
        isLatest: true,
      },
      order: {
        version: 'DESC',
      },
    });

    const uploadResult = await this.minioService.uploadFile({
      file,
      folder: `party-admissions/${applicationId}/application`,
    });

    const document = this.documentRepo.create({
      applicationId,
      stepId: step.id,
      submissionId: submission?.id,
      documentType: documentType || AdmissionDocumentType.OTHER,
      originalFileName: uploadResult.fileName,
      storedFileName: uploadResult.safeFileName,
      objectKey: uploadResult.objectName,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
      version: 1,
      isLatest: true,
      uploadedById: outstandingIndividualId,
      uploadedAt: new Date(),
    });

    const savedDocument = await this.documentRepo.save(document);

    await this.workflowLogService.createLog({
      applicationId,
      stepId: step.id,
      action: AdmissionLogAction.UPLOAD_APPLICATION_ATTACHMENT,
      toStatus: step.status,
      toStepCode: AdmissionWorkflowStep.APPLICATION_SUBMISSION,
      message: 'Tải lên file đính kèm đơn xin vào Đảng',
      actorId: outstandingIndividualId,
      actorRole: 'OUTSTANDING_INDIVIDUAL',
      metadata: {
        documentId: savedDocument.id,
        objectKey: savedDocument.objectKey,
      },
    });

    return savedDocument;
  }

  async createInitialDraft(params: {
    outstandingIndividualId: string;
    dto?: Partial<CreateApplicationDraftDto>;
  }) {
    const { outstandingIndividualId, dto } = params;

    const existingApplication = await this.applicationRepo.findOne({
      where: { outstandingIndividualId },
      order: { createdAt: 'DESC' },
    });

    if (existingApplication) {
      return {
        application: existingApplication,
        currentStep: await this.stepRepo.findOne({
          where: {
            applicationId: existingApplication.id,
            stepCode: AdmissionWorkflowStep.APPLICATION_SUBMISSION,
          },
        }),
        submission: await this.submissionRepo.findOne({
          where: {
            applicationId: existingApplication.id,
            stepCode: AdmissionWorkflowStep.APPLICATION_SUBMISSION,
            isLatest: true,
          },
          order: { createdAt: 'DESC' },
        }),
      };
    }

    const application = this.applicationRepo.create({
      outstandingIndividualId,
      overallStatus: AdmissionOverallStatus.DRAFT,
      currentStepCode: AdmissionWorkflowStep.APPLICATION_SUBMISSION,
      currentStepStatus: AdmissionWorkflowStepStatus.DRAFT,
      isLocked: false,
      createdById: outstandingIndividualId,
      updatedById: outstandingIndividualId,
    });

    const savedApplication = await this.applicationRepo.save(application);

    const step = this.stepRepo.create({
      applicationId: savedApplication.id,
      stepCode: AdmissionWorkflowStep.DRAFT,
      stepName: this.getStepName(AdmissionWorkflowStep.DRAFT),
      stepOrder: 1,
      status: AdmissionWorkflowStepStatus.DRAFT,
      isLocked: false,
      isCurrent: true,
      isCompleted: false,
      startedAt: new Date(),
    });

    const savedStep = await this.stepRepo.save(step);

    const submission = this.submissionRepo.create({
      applicationId: savedApplication.id,
      stepId: savedStep.id,
      stepCode: AdmissionWorkflowStep.APPLICATION_SUBMISSION,
      version: 1,
      status: AdmissionWorkflowStepStatus.DRAFT,
      formData: {
        reasonForJoining: dto?.reasonForJoining ?? '',
        partyApplicationLetter: dto?.partyApplicationLetter ?? null,
        personalBiography: dto?.personalBiography ?? null,
        partyMemberRecommendation: dto?.partyMemberRecommendation ?? null,
        youthUnionResolution: dto?.youthUnionResolution ?? null,
        otherDocuments: dto?.otherDocuments ?? null,
      },
      submittedById: outstandingIndividualId,
      isLatest: true,
    });

    const savedSubmission = await this.submissionRepo.save(submission);

    await this.workflowLogService.createLog({
      applicationId: savedApplication.id,
      stepId: savedStep.id,
      action: AdmissionLogAction.CREATE_APPLICATION_DRAFT,
      toStatus: AdmissionWorkflowStepStatus.DRAFT,
      toStepCode: AdmissionWorkflowStep.APPLICATION_SUBMISSION,
      message: 'Tạo mới bản nháp đơn xin vào Đảng',
      actorId: outstandingIndividualId,
      actorRole: 'OUTSTANDING_INDIVIDUAL',
      metadata: {
        submissionId: savedSubmission.id,
        autoCreated: true,
      },
    });

    return {
      application: savedApplication,
      currentStep: savedStep,
      submission: savedSubmission,
    };
  }

  async getMyApplicationDetail(params: { outstandingIndividualId: string }) {
    const { outstandingIndividualId } = params;

    let application = await this.applicationRepo.findOne({
      where: { outstandingIndividualId },
      order: { createdAt: 'DESC' },
    });

    if (!application) {
      const created = await this.createInitialDraft({
        outstandingIndividualId,
      });
      application = created.application;
    }

    const steps = await this.stepRepo.find({
      where: { applicationId: application.id },
      order: { stepOrder: 'ASC' },
    });

    const submissions = await this.submissionRepo.find({
      where: { applicationId: application.id },
      order: { createdAt: 'DESC' },
    });

    const documents = await this.documentRepo.find({
      where: { applicationId: application.id },
      order: { createdAt: 'DESC' },
    });

    return {
      application,
      steps,
      submissions,
      documents,
    };
  }

  async updateApplicationDraft(params: {
    applicationId: string;
    outstandingIndividualId: string;
    dto: UpdateApplicationDraftDto;
  }) {
    const { applicationId, outstandingIndividualId, dto } = params;

    const application = await this.applicationRepo.findOne({
      where: {
        id: applicationId,
        outstandingIndividualId,
      },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy hồ sơ kết nạp');
    }

    if (
      ![AdmissionOverallStatus.DRAFT, AdmissionOverallStatus.RETURNED].includes(
        application.overallStatus,
      )
    ) {
      throw new BadRequestException(
        'Không thể chỉnh sửa hồ sơ sau khi đã gửi duyệt',
      );
    }

    const step = await this.stepRepo.findOne({
      where: {
        applicationId,
        stepCode: AdmissionWorkflowStep.APPLICATION_SUBMISSION,
      },
    });

    if (!step) {
      throw new NotFoundException('Không tìm thấy bước nộp hồ sơ');
    }

    const submission = await this.submissionRepo.findOne({
      where: {
        applicationId,
        stepId: step.id,
        isLatest: true,
      },
      order: {
        version: 'DESC',
      },
    });

    if (!submission) {
      throw new NotFoundException('Không tìm thấy bản nháp');
    }

    submission.formData = {
      ...submission.formData,
      reasonForJoining: dto.reasonForJoining ?? submission.formData?.reasonForJoining,
      partyApplicationLetter: dto.partyApplicationLetter ?? submission.formData?.partyApplicationLetter,
      personalBiography: dto.personalBiography ?? submission.formData?.personalBiography,
      partyMemberRecommendation: dto.partyMemberRecommendation ?? submission.formData?.partyMemberRecommendation,
      youthUnionResolution: dto.youthUnionResolution ?? submission.formData?.youthUnionResolution,
      otherDocuments: dto.otherDocuments ?? submission.formData?.otherDocuments,
    };

    const savedSubmission = await this.submissionRepo.save(submission);

    await this.workflowLogService.createLog({
      applicationId,
      stepId: step.id,
      action: AdmissionLogAction.UPDATE_APPLICATION_DRAFT,
      toStatus: step.status,
      toStepCode: AdmissionWorkflowStep.APPLICATION_SUBMISSION,
      message: 'Cập nhật bản nháp đơn xin vào Đảng',
      actorId: outstandingIndividualId,
      actorRole: 'OUTSTANDING_INDIVIDUAL',
      metadata: {
        submissionId: savedSubmission.id,
      },
    });

    return savedSubmission;
  }

  async getApplicationDetail(params: {
    applicationId: string;
    userId: string;
  }) {
    const { applicationId, userId } = params;

    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy hồ sơ kết nạp');
    }

    const steps = await this.stepRepo.find({
      where: { applicationId: application.id },
      order: { stepOrder: 'ASC' },
    });

    const submissions = await this.submissionRepo.find({
      where: { applicationId: application.id },
      order: { createdAt: 'DESC' },
    });

    const documents = await this.documentRepo.find({
      where: { applicationId: application.id },
      order: { createdAt: 'DESC' },
    });

    return {
      application,
      steps,
      submissions,
      documents,
    };
  }

  async createDraft(params: {
    outstandingIndividualId: string;
    dto: Partial<CreateApplicationDraftDto>;
  }) {
    return await this.createInitialDraft(params);
  }

  async updateDraft(params: {
    outstandingIndividualId: string;
    dto: UpdateApplicationDraftDto;
  }) {
    const { outstandingIndividualId, dto } = params;

    let application = await this.applicationRepo.findOne({
      where: { outstandingIndividualId },
      order: { createdAt: 'DESC' },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy hồ sơ kết nạp');
    }

    return await this.updateApplicationDraft({
      applicationId: application.id,
      outstandingIndividualId,
      dto,
    });
  }

  async submitApplicationByUser(params: {
    outstandingIndividualId: string;
    dto?: SubmitApplicationDto;
  }) {
    const { outstandingIndividualId, dto } = params;

    let application = await this.applicationRepo.findOne({
      where: { outstandingIndividualId },
      order: { createdAt: 'DESC' },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy hồ sơ kết nạp');
    }

    await this.validateRequiredDocuments(application.id);

    return await this.submitApplication({
      applicationId: application.id,
      outstandingIndividualId,
      dto,
    });
  }

  private async validateRequiredDocuments(applicationId: string): Promise<void> {
    const REQUIRED_DOCUMENT_TYPES = [
      AdmissionDocumentType.DON_XIN_VAO_DANG,
      AdmissionDocumentType.LY_LICH_NGUOI_XIN_VAO_DANG,
      AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_1,
      AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_2,
      AdmissionDocumentType.NGHI_QUYET_CHI_DOAN,
    ];

    const documents = await this.documentRepo.find({
      where: {
        applicationId,
        isLatest: true,
      },
    });

    const uploadedTypes = new Set(
      documents.map((doc) => doc.documentType),
    );

    const missingDocuments: string[] = [];

    for (const docType of REQUIRED_DOCUMENT_TYPES) {
      if (!uploadedTypes.has(docType)) {
        const docName = this.getDocumentTypeName(docType);
        missingDocuments.push(docName);
      }
    }

    if (missingDocuments.length > 0) {
      throw new BadRequestException(
        `Hồ sơ chưa đầy đủ. Vui lòng bổ sung các giấy tờ sau: ${missingDocuments.join(', ')}`,
      );
    }
  }

  private getDocumentTypeName(docType: AdmissionDocumentType): string {
    switch (docType) {
      case AdmissionDocumentType.DON_XIN_VAO_DANG:
        return 'Đơn xin vào Đảng';
      case AdmissionDocumentType.LY_LICH_NGUOI_XIN_VAO_DANG:
        return 'Lý lịch của người xin vào Đảng';
      case AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_1:
        return 'Giấy giới thiệu của đảng viên chính thức (người 1)';
      case AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_2:
        return 'Giấy giới thiệu của đảng viên chính thức (người 2)';
      case AdmissionDocumentType.NGHI_QUYET_CHI_DOAN:
        return 'Nghị quyết giới thiệu đoàn viên của Chi đoàn';
      case AdmissionDocumentType.LY_LICH:
        return 'Lý lịch';
      case AdmissionDocumentType.XAC_MINH_DIA_PHUONG:
        return 'Xác minh địa phương';
      case AdmissionDocumentType.NGHI_QUYET_KET_NAP_DU_THAO:
        return 'Nghị quyết kết nạp dự thảo';
      case AdmissionDocumentType.OTHER:
        return 'Giấy tờ khác';
      default:
        return docType;
    }
  }

  async submitApplication(params: {
    applicationId: string;
    outstandingIndividualId: string;
    dto?: SubmitApplicationDto;
  }) {
    const { applicationId, outstandingIndividualId, dto } = params;

    const application = await this.applicationRepo.findOne({
      where: {
        id: applicationId,
        outstandingIndividualId,
      },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy hồ sơ kết nạp');
    }

    if (
      ![AdmissionOverallStatus.DRAFT, AdmissionOverallStatus.RETURNED].includes(
        application.overallStatus,
      )
    ) {
      throw new BadRequestException('Đơn đã được gửi trước đó');
    }

    const step = await this.stepRepo.findOne({
      where: {
        applicationId,
      },
    });

    if (!step) {
      throw new NotFoundException('Không tìm thấy bước nộp hồ sơ');
    }

    if (
      ![AdmissionWorkflowStepStatus.DRAFT, AdmissionWorkflowStepStatus.RETURNED].includes(
        step.status,
      )
    ) {
      throw new BadRequestException('Bước hiện tại không thể nộp đơn');
    }

    const latestSubmission = await this.submissionRepo.findOne({
      where: {
        applicationId,
        stepId: step.id,
        isLatest: true,
      },
      order: {
        version: 'DESC',
      },
    });

    if (!latestSubmission) {
      throw new BadRequestException('Chưa có nội dung đơn để nộp');
    }

    const mergedReason =
      dto?.reasonForJoining ??
      String(latestSubmission.formData?.reasonForJoining ?? '').trim();

    if (!mergedReason) {
      throw new BadRequestException('Lý do xin vào Đảng không được để trống');
    }

    latestSubmission.formData = {
      ...latestSubmission.formData,
      ...(dto?.reasonForJoining !== undefined
        ? { reasonForJoining: dto.reasonForJoining }
        : {}),
      ...(dto?.note !== undefined ? { note: dto.note } : {}),
    };

    latestSubmission.status = AdmissionWorkflowStepStatus.PENDING;
    latestSubmission.submittedById = outstandingIndividualId;
    latestSubmission.submittedAt = new Date();

    const savedSubmission = await this.submissionRepo.save(latestSubmission);

    step.status = AdmissionWorkflowStepStatus.PENDING;
    step.submittedAt = new Date();
    step.isCurrent = true;
    await this.stepRepo.save(step);

    application.overallStatus = AdmissionOverallStatus.IN_PROGRESS;
    application.currentStepCode = AdmissionWorkflowStep.DRAFT;
    application.currentStepStatus = AdmissionWorkflowStepStatus.PENDING;
    application.submittedAt = new Date();
    application.updatedById = outstandingIndividualId;
    await this.applicationRepo.save(application);

    await this.workflowLogService.createLog({
      applicationId,
      stepId: step.id,
      action: AdmissionLogAction.SUBMIT_APPLICATION,
      toStatus: AdmissionWorkflowStepStatus.PENDING,
      toStepCode: AdmissionWorkflowStep.APPLICATION_SUBMISSION,
      message: 'Nộp đơn xin vào Đảng thành công, chờ Chi uỷ duyệt',
      actorId: outstandingIndividualId,
      actorRole: 'OUTSTANDING_INDIVIDUAL',
      metadata: {
        submissionId: savedSubmission.id,
      },
    });

    return {
      message: 'Đơn đã được gửi thành công. Vui lòng chờ Chi uỷ xác nhận.',
      application,
      currentStep: step,
      submission: savedSubmission,
    };
  }
}
