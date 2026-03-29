import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { PartyAdmissionApplicationEntity } from '../entities/party-admission-application.entity';
import { PartyAdmissionStepEntity } from '../entities/party-admission-step.entity';
import { PartyAdmissionStepSubmissionEntity } from '../entities/party-admission-step-submission.entity';
import { PartyAdmissionDocumentEntity } from '../entities/party-admission-document.entity';
import { MinioService } from 'src/modules/minio/minio.service';
import { AdmissionStepCode } from '../enum/admission-step-code.enum';
import { AdmissionStatus } from '../enum/admission-status.enum';
import { AdmissionStepStatus } from '../enum/admission-step-status.enum';
import { AdmissionLogAction } from '../enum/admission-log-action.enum';
import { UpdateApplicationDraftDto } from '../dto/update-application-draft.dto';
import { AdmissionDocumentType } from '../enum/admission-document-type.enum';
import { SubmitApplicationDto } from '../dto/submit-application.dto';
import { AdmissionWorkflowLogService } from './admission-workflow-log.service';
import { CreateApplicationDraftDto } from '../dto/create-application-draft.dto';

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

  // private buildApplicationCode(): string {
  //   const now = new Date();
  //   const y = now.getFullYear();
  //   const m = String(now.getMonth() + 1).padStart(2, '0');
  //   const d = String(now.getDate()).padStart(2, '0');
  //   return `PADM-${y}${m}${d}-${randomUUID().slice(0, 8).toUpperCase()}`;
  // }

  private getStepName(stepCode: AdmissionStepCode): string {
    switch (stepCode) {
      case AdmissionStepCode.APPLICATION:
        return 'Viết đơn';
      case AdmissionStepCode.TRAINING_CLASS:
        return 'Lớp bồi dưỡng';
      case AdmissionStepCode.VERIFICATION:
        return 'Thẩm tra xác minh';
      case AdmissionStepCode.UNION_FEEDBACK:
        return 'Ý kiến đoàn thể';
      case AdmissionStepCode.FINAL_REVIEW:
        return 'Xét duyệt cuối';
      case AdmissionStepCode.CEREMONY:
        return 'Lễ kết nạp';
      default:
        return stepCode;
    }
  }

  // async createDraft(params: {
  //   candidateUserId: string;
  //   partyCellId: string;
  //   dto: CreateApplicationDraftDto;
  // }) {
  //   const { candidateUserId, partyCellId, dto } = params;

  //   const existingOpenApplication = await this.applicationRepo.findOne({
  //     where: {
  //       candidateUserId,
  //     },
  //     order: {
  //       createdAt: 'DESC',
  //     },
  //   });

  //   if (
  //     existingOpenApplication &&
  //     ![AdmissionStatus.DRAFT, AdmissionStatus.NEED_SUPPLEMENT].includes(
  //       existingOpenApplication.overallStatus,
  //     ) &&
  //     existingOpenApplication.currentStepCode === AdmissionStepCode.APPLICATION
  //   ) {
  //     throw new BadRequestException(
  //       'Bạn đã có hồ sơ kết nạp đang được xử lý hoặc đang soạn thảo',
  //     );
  //   }

  //   const application = this.applicationRepo.create({
  //     code: this.buildApplicationCode(),
  //     candidateUserId,
  //     partyCellId,
  //     overallStatus: AdmissionStatus.DRAFT,
  //     currentStepCode: AdmissionStepCode.APPLICATION,
  //     currentStepStatus: AdmissionStepStatus.DRAFT,
  //     isLocked: false,
  //     createdById: candidateUserId,
  //     updatedById: candidateUserId,
  //   });

  //   const savedApplication = await this.applicationRepo.save(application);

  //   const step = this.stepRepo.create({
  //     applicationId: savedApplication.id,
  //     stepCode: AdmissionStepCode.APPLICATION,
  //     stepName: this.getStepName(AdmissionStepCode.APPLICATION),
  //     stepOrder: 1,
  //     status: AdmissionStepStatus.DRAFT,
  //     isLocked: false,
  //     isCurrent: true,
  //     isCompleted: false,
  //     openedAt: new Date(),
  //   });

  //   await this.stepRepo.save(step);

  //   const submission = this.submissionRepo.create({
  //     applicationId: savedApplication.id,
  //     stepId: step.id,
  //     stepCode: AdmissionStepCode.APPLICATION,
  //     version: 1,
  //     status: AdmissionStepStatus.DRAFT,
  //     formData: {
  //       fullName: dto.fullName,
  //       dateOfBirth: dto.dateOfBirth,
  //       phoneNumber: dto.phoneNumber,
  //       email: dto.email,
  //       permanentAddress: dto.permanentAddress,
  //       reasonForJoining: dto.reasonForJoining,
  //       partyApplicationLetter: dto.partyApplicationLetter,
  //       personalBiography: dto.personalBiography,
  //       partyMemberRecommendation: dto.partyMemberRecommendation,
  //       youthUnionResolution: dto.youthUnionResolution,
  //       otherDocuments: dto.otherDocuments,
  //     },
  //     isLatest: true,
  //   });

  //   const savedSubmission = await this.submissionRepo.save(submission);

  //   await this.workflowLogService.createLog({
  //     applicationId: savedApplication.id,
  //     stepId: step.id,
  //     action: AdmissionLogAction.CREATE_APPLICATION_DRAFT,
  //     toStatus: AdmissionStepStatus.DRAFT,
  //     toStepCode: AdmissionStepCode.APPLICATION,
  //     message: 'Tạo bản nháp đơn xin vào Đảng',
  //     actorId: candidateUserId,
  //     actorRole: 'OUTSTANDING_INDIVIDUAL',
  //     metadata: {
  //       submissionId: savedSubmission.id,
  //     },
  //   });

  //   return {
  //     application: savedApplication,
  //     currentStep: step,
  //     submission: savedSubmission,
  //   };
  // }

  // async updateDraft(params: {
  //   applicationId: string;
  //   candidateUserId: string;
  //   dto: UpdateApplicationDraftDto;
  // }) {
  //   const { applicationId, candidateUserId, dto } = params;

  //   const application = await this.applicationRepo.findOne({
  //     where: {
  //       id: applicationId,
  //       candidateUserId,
  //     },
  //   });

  //   if (!application) {
  //     throw new NotFoundException('Không tìm thấy hồ sơ kết nạp');
  //   }

  //   if (
  //     ![AdmissionStatus.DRAFT, AdmissionStatus.NEED_SUPPLEMENT].includes(
  //       application.overallStatus,
  //     )
  //   ) {
  //     throw new BadRequestException('Đơn đã gửi duyệt, không thể chỉnh sửa');
  //   }

  //   const step = await this.stepRepo.findOne({
  //     where: {
  //       applicationId,
  //       stepCode: AdmissionStepCode.APPLICATION,
  //     },
  //   });

  //   if (!step) {
  //     throw new NotFoundException('Không tìm thấy bước viết đơn');
  //   }

  //   if (
  //     ![AdmissionStepStatus.DRAFT, AdmissionStepStatus.RETURNED].includes(
  //       step.status,
  //     )
  //   ) {
  //     throw new BadRequestException(
  //       'Bước viết đơn hiện không cho phép chỉnh sửa',
  //     );
  //   }

  //   const latestSubmission = await this.submissionRepo.findOne({
  //     where: {
  //       applicationId,
  //       stepId: step.id,
  //       isLatest: true,
  //     },
  //     order: {
  //       version: 'DESC',
  //     },
  //   });

  //   if (!latestSubmission) {
  //     throw new NotFoundException('Không tìm thấy bản nháp hiện tại');
  //   }

  //   latestSubmission.formData = {
  //     ...latestSubmission.formData,
  //     ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
  //     ...(dto.dateOfBirth !== undefined
  //       ? { dateOfBirth: dto.dateOfBirth }
  //       : {}),
  //     ...(dto.phoneNumber !== undefined
  //       ? { phoneNumber: dto.phoneNumber }
  //       : {}),
  //     ...(dto.email !== undefined ? { email: dto.email } : {}),
  //     ...(dto.permanentAddress !== undefined
  //       ? { permanentAddress: dto.permanentAddress }
  //       : {}),
  //     ...(dto.reasonForJoining !== undefined
  //       ? { reasonForJoining: dto.reasonForJoining }
  //       : {}),
  //     ...(dto.partyApplicationLetter !== undefined
  //       ? { partyApplicationLetter: dto.partyApplicationLetter }
  //       : {}),
  //     ...(dto.personalBiography !== undefined
  //       ? { personalBiography: dto.personalBiography }
  //       : {}),
  //     ...(dto.partyMemberRecommendation !== undefined
  //       ? { partyMemberRecommendation: dto.partyMemberRecommendation }
  //       : {}),
  //     ...(dto.youthUnionResolution !== undefined
  //       ? { youthUnionResolution: dto.youthUnionResolution }
  //       : {}),
  //     ...(dto.otherDocuments !== undefined
  //       ? { otherDocuments: dto.otherDocuments }
  //       : {}),
  //   };

  //   latestSubmission.status = AdmissionStepStatus.DRAFT;
  //   const savedSubmission = await this.submissionRepo.save(latestSubmission);

  //   application.updatedById = candidateUserId;
  //   await this.applicationRepo.save(application);

  //   await this.workflowLogService.createLog({
  //     applicationId,
  //     stepId: step.id,
  //     action: AdmissionLogAction.UPDATE_APPLICATION_DRAFT,
  //     fromStatus: step.status,
  //     toStatus: AdmissionStepStatus.DRAFT,
  //     fromStepCode: AdmissionStepCode.APPLICATION,
  //     toStepCode: AdmissionStepCode.APPLICATION,
  //     message: 'Cập nhật bản nháp đơn xin vào Đảng',
  //     actorId: candidateUserId,
  //     actorRole: 'OUTSTANDING_INDIVIDUAL',
  //     metadata: {
  //       submissionId: savedSubmission.id,
  //     },
  //   });

  //   return {
  //     application,
  //     currentStep: step,
  //     submission: savedSubmission,
  //   };
  // }

  // async uploadApplicationAttachment(params: {
  //   applicationId: string;
  //   candidateUserId: string;
  //   file: Express.Multer.File;
  //   documentType?: AdmissionDocumentType;
  // }) {
  //   const { applicationId, candidateUserId, file, documentType } = params;

  //   if (!file) {
  //     throw new BadRequestException('Vui lòng chọn file');
  //   }

  //   const application = await this.applicationRepo.findOne({
  //     where: {
  //       id: applicationId,
  //       candidateUserId,
  //     },
  //   });

  //   if (!application) {
  //     throw new NotFoundException('Không tìm thấy hồ sơ kết nạp');
  //   }

  //   if (
  //     ![AdmissionStatus.DRAFT, AdmissionStatus.NEED_SUPPLEMENT].includes(
  //       application.overallStatus,
  //     )
  //   ) {
  //     throw new BadRequestException(
  //       'Không thể tải thêm file sau khi đã gửi duyệt',
  //     );
  //   }

  //   const step = await this.stepRepo.findOne({
  //     where: {
  //       applicationId,
  //       stepCode: AdmissionStepCode.APPLICATION,
  //     },
  //   });

  //   if (!step) {
  //     throw new NotFoundException('Không tìm thấy bước viết đơn');
  //   }

  //   const submission = await this.submissionRepo.findOne({
  //     where: {
  //       applicationId,
  //       stepId: step.id,
  //       isLatest: true,
  //     },
  //     order: {
  //       version: 'DESC',
  //     },
  //   });

  //   const uploadResult = await this.minioService.uploadFile({
  //     file,
  //     folder: `party-admissions/${applicationId}/application`,
  //   });

  //   const document = this.documentRepo.create({
  //     applicationId,
  //     stepId: step.id,
  //     submissionId: submission?.id,
  //     documentType: documentType || AdmissionDocumentType.OTHER,
  //     originalFileName: uploadResult.fileName,
  //     storedFileName:
  //       uploadResult.objectName.split('/').pop() || uploadResult.fileName,
  //     objectKey: uploadResult.objectName,
  //     mimeType: uploadResult.mimeType,
  //     size: uploadResult.size,
  //     version: 1,
  //     isLatest: true,
  //     uploadedById: candidateUserId,
  //     uploadedAt: new Date(),
  //   });

  //   const savedDocument = await this.documentRepo.save(document);

  //   await this.workflowLogService.createLog({
  //     applicationId,
  //     stepId: step.id,
  //     action: AdmissionLogAction.UPLOAD_APPLICATION_ATTACHMENT,
  //     toStatus: step.status,
  //     toStepCode: AdmissionStepCode.APPLICATION,
  //     message: 'Tải lên file đính kèm đơn xin vào Đảng',
  //     actorId: candidateUserId,
  //     actorRole: 'OUTSTANDING_INDIVIDUAL',
  //     metadata: {
  //       documentId: savedDocument.id,
  //       objectKey: savedDocument.objectKey,
  //     },
  //   });

  //   return savedDocument;
  // }

  // async submitApplication(params: {
  //   applicationId: string;
  //   candidateUserId: string;
  //   dto?: SubmitApplicationDto;
  // }) {
  //   const { applicationId, candidateUserId, dto } = params;

  //   const application = await this.applicationRepo.findOne({
  //     where: {
  //       id: applicationId,
  //       candidateUserId,
  //     },
  //   });

  //   if (!application) {
  //     throw new NotFoundException('Không tìm thấy hồ sơ kết nạp');
  //   }

  //   if (
  //     ![AdmissionStatus.DRAFT, AdmissionStatus.NEED_SUPPLEMENT].includes(
  //       application.overallStatus,
  //     )
  //   ) {
  //     throw new BadRequestException('Đơn đã được gửi trước đó');
  //   }

  //   const step = await this.stepRepo.findOne({
  //     where: {
  //       applicationId,
  //       stepCode: AdmissionStepCode.APPLICATION,
  //     },
  //   });

  //   if (!step) {
  //     throw new NotFoundException('Không tìm thấy bước viết đơn');
  //   }

  //   if (
  //     ![AdmissionStepStatus.DRAFT, AdmissionStepStatus.RETURNED].includes(
  //       step.status,
  //     )
  //   ) {
  //     throw new BadRequestException('Bước hiện tại không thể nộp đơn');
  //   }

  //   const latestSubmission = await this.submissionRepo.findOne({
  //     where: {
  //       applicationId,
  //       stepId: step.id,
  //       isLatest: true,
  //     },
  //     order: {
  //       version: 'DESC',
  //     },
  //   });

  //   if (!latestSubmission) {
  //     throw new BadRequestException('Chưa có nội dung đơn để nộp');
  //   }

  //   const mergedReason =
  //     dto?.reasonForJoining ??
  //     String(latestSubmission.formData?.reasonForJoining ?? '').trim();

  //   if (!mergedReason) {
  //     throw new BadRequestException('Lý do xin vào Đảng không được để trống');
  //   }

  //   latestSubmission.formData = {
  //     ...latestSubmission.formData,
  //     ...(dto?.reasonForJoining !== undefined
  //       ? { reasonForJoining: dto.reasonForJoining }
  //       : {}),
  //   };

  //   latestSubmission.status = AdmissionStepStatus.PENDING_APPROVAL;
  //   latestSubmission.submittedById = candidateUserId;
  //   latestSubmission.submittedAt = new Date();

  //   const savedSubmission = await this.submissionRepo.save(latestSubmission);

  //   step.status = AdmissionStepStatus.PENDING_APPROVAL;
  //   step.submittedAt = new Date();
  //   step.isCurrent = true;
  //   await this.stepRepo.save(step);

  //   application.overallStatus = AdmissionStatus.CHI_UY_REVIEWING;
  //   application.currentStepCode = AdmissionStepCode.APPLICATION;
  //   application.currentStepStatus = AdmissionStepStatus.PENDING_APPROVAL;
  //   application.submittedAt = new Date();
  //   application.updatedById = candidateUserId;
  //   await this.applicationRepo.save(application);

  //   await this.workflowLogService.createLog({
  //     applicationId,
  //     stepId: step.id,
  //     action: AdmissionLogAction.SUBMIT_APPLICATION,
  //     fromStatus: AdmissionStepStatus.DRAFT,
  //     toStatus: AdmissionStepStatus.PENDING_APPROVAL,
  //     fromStepCode: AdmissionStepCode.APPLICATION,
  //     toStepCode: AdmissionStepCode.APPLICATION,
  //     message: 'Nộp đơn xin vào Đảng thành công, chờ Chi uỷ duyệt',
  //     actorId: candidateUserId,
  //     actorRole: 'OUTSTANDING_INDIVIDUAL',
  //     metadata: {
  //       submissionId: savedSubmission.id,
  //     },
  //   });

  //   return {
  //     message: 'Đơn đã được gửi thành công. Vui lòng chờ Chi uỷ xác nhận.',
  //     application,
  //     currentStep: step,
  //     submission: savedSubmission,
  //   };
  // }

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
            stepCode: AdmissionStepCode.APPLICATION,
          },
        }),
        submission: await this.submissionRepo.findOne({
          where: {
            applicationId: existingApplication.id,
            stepCode: AdmissionStepCode.APPLICATION,
            isLatest: true,
          },
          order: { createdAt: 'DESC' },
        }),
      };
    }

    const application = this.applicationRepo.create({
      outstandingIndividualId,
      overallStatus: AdmissionStatus.DRAFT,
      currentStepCode: AdmissionStepCode.APPLICATION,
      currentStepStatus: AdmissionStepStatus.DRAFT,
      isLocked: false,
      createdById: outstandingIndividualId,
      updatedById: outstandingIndividualId,
    });

    const savedApplication = await this.applicationRepo.save(application);

    const step = this.stepRepo.create({
      applicationId: savedApplication.id,
      stepCode: AdmissionStepCode.APPLICATION,
      stepName: this.getStepName(AdmissionStepCode.APPLICATION),
      stepOrder: 1,
      status: AdmissionStepStatus.DRAFT,
      isLocked: false,
      isCurrent: true,
      isCompleted: false,
      openedAt: new Date(),
    });

    const savedStep = await this.stepRepo.save(step);

    const submission = this.submissionRepo.create({
      applicationId: savedApplication.id,
      stepId: savedStep.id,
      stepCode: AdmissionStepCode.APPLICATION,
      version: 1,
      status: AdmissionStepStatus.DRAFT,
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
      toStatus: AdmissionStepStatus.DRAFT,
      toStepCode: AdmissionStepCode.APPLICATION,
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
}
