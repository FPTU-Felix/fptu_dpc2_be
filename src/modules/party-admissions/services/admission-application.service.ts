import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { PartyAdmissionApplicationEntity } from '../entities/party-admission-application.entity';
import { PartyAdmissionStepEntity } from '../entities/party-admission-step.entity';

import { AdmissionOverallStatus } from '../enum/admission-overall-status';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
import { MyAdmissionCurrentStatusResponseDto } from "../dto/response/my-admission-current-status.response.dto"
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MyAdmissionStepReviewResponseDto } from "../dto/response/my-admission-current-status.response.dto"
import { PartyAdmissionStepReviewEntity } from "../entities/party-admission-step-review.entity"
import { PartyAdmissionStepSubmissionEntity } from "../entities/party-admission-step-submission.entity"
import { MyAdmissionStepSubmissionResponseDto } from "../dto/response/my-admission-current-status.response.dto"
import { MyAdmissionStepResponseDto } from "../dto/response/my-admission-current-status.response.dto"
import { AdmissionSubmissionStatus } from '../dto/admission-submission-status.dto';
console.log({
  PartyAdmissionApplicationEntity,
  PartyAdmissionStepEntity,
  PartyAdmissionStepSubmissionEntity,
  PartyAdmissionStepReviewEntity,
});
@Injectable()

export class AdmissionApplicationService {

  constructor(
    @InjectRepository(PartyAdmissionApplicationEntity)
    private readonly applicationRepo: Repository<PartyAdmissionApplicationEntity>,

    @InjectRepository(PartyAdmissionStepEntity)
    private readonly stepRepo: Repository<PartyAdmissionStepEntity>,

    @InjectRepository(PartyAdmissionStepSubmissionEntity)
    private readonly submissionRepo: Repository<PartyAdmissionStepSubmissionEntity>,

    @InjectRepository(PartyAdmissionStepReviewEntity)
    private readonly reviewRepo: Repository<PartyAdmissionStepReviewEntity>,

    private readonly dataSource: DataSource,
  ) { }

  private generateApplicationCode(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const suffix = randomUUID().slice(0, 8).toUpperCase();

    return `PADM-${yyyy}${mm}${dd}-${suffix}`;
  }

  async initAdmissionForQCUT(userId: string) {
    return await this.dataSource.transaction(async (manager) => {
      const applicationRepo = manager.getRepository(
        PartyAdmissionApplicationEntity,
      );
      const stepRepo = manager.getRepository(PartyAdmissionStepEntity);

      // 🔥 chỉ lấy hồ sơ đang active
      const existed = await applicationRepo.findOne({
        where: {
          outstandingIndividualId: userId,
          overallStatus: In([
            AdmissionOverallStatus.DRAFT,
            AdmissionOverallStatus.IN_PROGRESS,
            AdmissionOverallStatus.RETURNED,
          ]),
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (existed) {
        const steps = await stepRepo.find({
          where: { applicationId: existed.id },
          order: { stepOrder: 'ASC' },
        });

        return {
          application: existed,
          steps,
          isNew: false,
        };
      }

      // 1. tạo application
      const application = applicationRepo.create({
        code: this.generateApplicationCode(),
        outstandingIndividualId: userId,
        overallStatus: AdmissionOverallStatus.DRAFT,
        currentStepCode: AdmissionWorkflowStep.APPLICATION,
        currentStepStatus: AdmissionWorkflowStepStatus.IN_PROGRESS,
        isLocked: false,
      });

      const savedApplication = await applicationRepo.save(application);

      // 2. tạo steps
      const stepsPayload: Partial<PartyAdmissionStepEntity>[] = [
        {
          applicationId: savedApplication.id,
          stepCode: AdmissionWorkflowStep.APPLICATION,
          stepName: 'Nộp hồ sơ',
          stepOrder: 1,
          status: AdmissionWorkflowStepStatus.IN_PROGRESS, // ✅ fix
          isLocked: false,
          isCurrent: true,
          isCompleted: false,
          startedAt: new Date(),
          note: 'QCUT nộp hồ sơ xin kết nạp',
        },
        {
          applicationId: savedApplication.id,
          stepCode: AdmissionWorkflowStep.CHI_UY_REVIEW,
          stepName: 'Chi uỷ kiểm tra',
          stepOrder: 2,
          status: AdmissionWorkflowStepStatus.NOT_STARTED,
          isLocked: true,
          isCurrent: false,
          isCompleted: false,
          note: 'Chi uỷ kiểm tra lỗi hồ sơ',
        },
        {
          applicationId: savedApplication.id,
          stepCode: AdmissionWorkflowStep.PBT_CONTENT_REVIEW,
          stepName: 'PBT duyệt nội dung',
          stepOrder: 3,
          status: AdmissionWorkflowStepStatus.NOT_STARTED,
          isLocked: true,
          isCurrent: false,
          isCompleted: false,
          note: 'PBT duyệt nội dung hồ sơ',
        },
        {
          applicationId: savedApplication.id,
          stepCode: AdmissionWorkflowStep.LOCAL_VERIFICATION,
          stepName: 'Xác minh lý lịch',
          stepOrder: 4,
          status: AdmissionWorkflowStepStatus.NOT_STARTED,
          isLocked: true,
          isCurrent: false,
          isCompleted: false,
          note: 'QCUT đi xác minh lý lịch tại địa phương',
        },
        {
          applicationId: savedApplication.id,
          stepCode: AdmissionWorkflowStep.RED_SEAL_CHECK,
          stepName: 'Kiểm tra dấu đỏ',
          stepOrder: 5,
          status: AdmissionWorkflowStepStatus.NOT_STARTED,
          isLocked: true,
          isCurrent: false,
          isCompleted: false,
          note: 'PBT kiểm tra dấu đỏ và chốt',
        },
        {
          applicationId: savedApplication.id,
          stepCode: AdmissionWorkflowStep.RESOLUTION_DRAFTING,
          stepName: 'Soạn nghị quyết',
          stepOrder: 6,
          status: AdmissionWorkflowStepStatus.NOT_STARTED,
          isLocked: true,
          isCurrent: false,
          isCompleted: false,
          note: 'Chi uỷ soạn Nghị quyết kết nạp',
        },
        {
          applicationId: savedApplication.id,
          stepCode: AdmissionWorkflowStep.SECRETARY_RESOLUTION_REVIEW,
          stepName: 'Duyệt nghị quyết',
          stepOrder: 7,
          status: AdmissionWorkflowStepStatus.NOT_STARTED,
          isLocked: true,
          isCurrent: false,
          isCompleted: false,
          note: 'Bí thư duyệt Nghị quyết',
        },
      ];

      const savedSteps = await stepRepo.save(
        stepRepo.create(stepsPayload),
      );

      return {
        application: savedApplication,
        steps: savedSteps,
        isNew: true,
      };
    });
  }

  private mapReviewToResponse(
    review: PartyAdmissionStepReviewEntity,
  ): MyAdmissionStepReviewResponseDto {
    return {
      id: review.id,
      applicationId: review.applicationId,
      stepId: review.stepId,
      submissionId: review.submissionId,
      action: review.action,
      fromStatus: review.fromStatus,
      toStatus: review.toStatus,
      note: review.note,
      reason: review.reason,
      reviewerId: review.reviewerId,
      processedAt: review.processedAt,
      createdAt: (review as any).createdAt,
      updatedAt: (review as any).updatedAt,
    };
  }

  private mapSubmissionToResponse(
    submission: PartyAdmissionStepSubmissionEntity,
    reviews: PartyAdmissionStepReviewEntity[],
  ): MyAdmissionStepSubmissionResponseDto {
    const submissionReviews = reviews
      .filter((review) => review.submissionId === submission.id)
      .sort((a, b) => {
        const aTime = a.processedAt
          ? new Date(a.processedAt).getTime()
          : (a as any).createdAt
            ? new Date((a as any).createdAt).getTime()
            : 0;
        const bTime = b.processedAt
          ? new Date(b.processedAt).getTime()
          : (b as any).createdAt
            ? new Date((b as any).createdAt).getTime()
            : 0;
        return bTime - aTime;
      });

    return {
      id: submission.id,
      applicationId: submission.applicationId,
      stepId: submission.stepId,
      stepCode: submission.stepCode,
      version: submission.version,
      formData: submission.formData,
      note: submission.note,
      submittedById: submission.submittedById,
      submittedAt: submission.submittedAt,
      isLatest: submission.isLatest,
      createdAt: (submission as any).createdAt,
      updatedAt: (submission as any).updatedAt,
      reviews: submissionReviews.map((review) =>
        this.mapReviewToResponse(review),
      ),
    };
  }

  private mapStepToResponse(
    step: PartyAdmissionStepEntity,
    submissions: PartyAdmissionStepSubmissionEntity[],
    reviews: PartyAdmissionStepReviewEntity[],
  ): MyAdmissionStepResponseDto {
    const stepSubmissions = submissions
      .filter((submission) => submission.stepId === step.id)
      .sort((a, b) => {
        if (a.version !== b.version) {
          return b.version - a.version;
        }

        const aTime = a.submittedAt
          ? new Date(a.submittedAt).getTime()
          : (a as any).createdAt
            ? new Date((a as any).createdAt).getTime()
            : 0;
        const bTime = b.submittedAt
          ? new Date(b.submittedAt).getTime()
          : (b as any).createdAt
            ? new Date((b as any).createdAt).getTime()
            : 0;
        return bTime - aTime;
      });

    const stepReviews = reviews
      .filter((review) => review.stepId === step.id)
      .sort((a, b) => {
        const aTime = a.processedAt
          ? new Date(a.processedAt).getTime()
          : (a as any).createdAt
            ? new Date((a as any).createdAt).getTime()
            : 0;
        const bTime = b.processedAt
          ? new Date(b.processedAt).getTime()
          : (b as any).createdAt
            ? new Date((b as any).createdAt).getTime()
            : 0;
        return bTime - aTime;
      });

    const latestSubmission =
      stepSubmissions.find((submission) => submission.isLatest) ??
      stepSubmissions[0] ??
      null;

    const latestReview = stepReviews[0] ?? null;

    return {
      id: step.id,
      applicationId: step.applicationId,
      stepCode: step.stepCode,
      stepName: step.stepName,
      stepOrder: step.stepOrder,
      status: step.status,
      isLocked: step.isLocked,
      isCurrent: step.isCurrent,
      isCompleted: step.isCompleted,
      assignedToId: step.assignedToId,
      processedById: step.processedById,
      startedAt: step.startedAt,
      submittedAt: step.submittedAt,
      processedAt: step.processedAt,
      completedAt: step.completedAt,
      returnedAt: step.returnedAt,
      note: step.note,
      createdAt: (step as any).createdAt,
      updatedAt: (step as any).updatedAt,
      latestSubmission: latestSubmission
        ? this.mapSubmissionToResponse(latestSubmission, stepReviews)
        : null,
      latestReview: latestReview
        ? this.mapReviewToResponse(latestReview)
        : null,
      submissions: stepSubmissions.map((submission) =>
        this.mapSubmissionToResponse(submission, stepReviews),
      ),
      reviews: stepReviews.map((review) => this.mapReviewToResponse(review)),
    };
  }

  async getMyCurrentStatus(
    outstandingIndividualId: string,
  ): Promise<MyAdmissionCurrentStatusResponseDto> {
    const application = await this.applicationRepo.findOne({
      where: {
        outstandingIndividualId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!application) {
      throw new NotFoundException(
        'Không tìm thấy hồ sơ kết nạp của người dùng hiện tại',
      );
    }

    const [steps, submissions, reviews] = await Promise.all([
      this.stepRepo.find({
        where: {
          applicationId: application.id,
        },
        order: {
          stepOrder: 'ASC',
        },
      }),
      this.submissionRepo.find({
        where: {
          applicationId: application.id,
        },
        order: {
          version: 'DESC',
        },
      }),
      this.reviewRepo.find({
        where: {
          applicationId: application.id,
        },
        order: {
          processedAt: 'DESC',
        },
      }),
    ]);

    const mappedSteps = steps.map((step) =>
      this.mapStepToResponse(step, submissions, reviews),
    );

    const currentStep =
      mappedSteps.find((step) => step.isCurrent) ||
      mappedSteps.find(
        (step) => step.stepCode === application.currentStepCode,
      ) ||
      null;

    return {
      applicationId: application.id,
      code: application.code,
      outstandingIndividualId: application.outstandingIndividualId,
      overallStatus: application.overallStatus,
      currentStepCode: application.currentStepCode,
      currentStepStatus: application.currentStepStatus,
      isLocked: application.isLocked,
      createdAt: application.createdAt,
      currentStep,
      steps: mappedSteps,
    };
  }

  async getMyCurrentStatusWithRoleCheck(user: {
    id: string;
    role?: { name?: string } | string;
    roleName?: string;
  }): Promise<MyAdmissionCurrentStatusResponseDto> {
    const roleName =
      user.roleName ||
      (typeof user.role === 'string' ? user.role : user.role?.name);

    if (
      roleName &&
      roleName !== 'OUTSTANDING_INDIVIDUAL' &&
      roleName !== 'QCUT'
    ) {
      throw new ForbiddenException(
        'Chỉ QCUT / OUTSTANDING_INDIVIDUAL mới được truy cập API này',
      );
    }

    return this.getMyCurrentStatus(user.id);
  }

  private getRoleName(user: {
    role?: { name?: string } | string;
    roleName?: string;
  }): string | undefined {
    return (
      user.roleName ||
      (typeof user.role === 'string' ? user.role : user.role?.name)
    );
  }

  private validateQcutRole(user: {
    id: string;
    role?: { name?: string } | string;
    roleName?: string;
  }) {
    const roleName = this.getRoleName(user);

    if (
      roleName &&
      roleName !== 'OUTSTANDING_INDIVIDUAL' &&
      roleName !== 'QCUT'
    ) {
      throw new ForbiddenException(
        'Chỉ QCUT / OUTSTANDING_INDIVIDUAL mới được thao tác API này',
      );
    }
  }

  private validateApplicationEditable(
    application: PartyAdmissionApplicationEntity,
  ) {
    const blockedStatuses: AdmissionOverallStatus[] = [
      AdmissionOverallStatus.APPROVED,
      AdmissionOverallStatus.REJECTED,
      AdmissionOverallStatus.CANCELLED,
    ];

    if (blockedStatuses.includes(application.overallStatus)) {
      throw new BadRequestException(
        `Hồ sơ đang ở trạng thái ${application.overallStatus}, không thể chỉnh sửa`,
      );
    }
  }

  private validateStepEditableForDraft(step: PartyAdmissionStepEntity) {
    if (!step.isCurrent) {
      throw new BadRequestException(
        'Chỉ được thao tác trên bước hiện tại của hồ sơ',
      );
    }

    if (step.isCompleted) {
      throw new BadRequestException('Bước này đã hoàn thành');
    }

    const allowedStatuses: AdmissionWorkflowStepStatus[] = [
      AdmissionWorkflowStepStatus.NOT_STARTED,
      AdmissionWorkflowStepStatus.RETURNED,
      AdmissionWorkflowStepStatus.IN_PROGRESS,
    ];

    if (!allowedStatuses.includes(step.status)) {
      throw new BadRequestException(
        `Bước hiện tại đang ở trạng thái ${step.status}, không thể lưu draft`,
      );
    }
  }

  private validateStepEditableForSubmit(step: PartyAdmissionStepEntity) {
    if (!step.isCurrent) {
      throw new BadRequestException(
        'Chỉ được submit bước hiện tại của hồ sơ',
      );
    }

    if (step.isCompleted) {
      throw new BadRequestException('Bước này đã hoàn thành');
    }

    const allowedStatuses: AdmissionWorkflowStepStatus[] = [
      AdmissionWorkflowStepStatus.NOT_STARTED,
      AdmissionWorkflowStepStatus.RETURNED,
      AdmissionWorkflowStepStatus.IN_PROGRESS,
    ];

    if (!allowedStatuses.includes(step.status)) {
      throw new BadRequestException(
        `Bước hiện tại đang ở trạng thái ${step.status}, không thể submit`,
      );
    }
  }

  private validateLatestSubmissionForDraft(
    latestSubmission?: PartyAdmissionStepSubmissionEntity | null,
  ) {
    if (!latestSubmission) return;

    const blockedStatuses: AdmissionSubmissionStatus[] = [
      AdmissionSubmissionStatus.PENDING,
      AdmissionSubmissionStatus.APPROVED,
      AdmissionSubmissionStatus.REJECTED,
    ];

    if (blockedStatuses.includes(latestSubmission.stepSubmissionStatus)) {
      throw new BadRequestException(
        `Submission mới nhất đang ở trạng thái ${latestSubmission.status}, không thể lưu draft`,
      );
    }
  }

  private validateLatestSubmissionForSubmit(
    latestSubmission?: PartyAdmissionStepSubmissionEntity | null,
  ) {
    if (!latestSubmission) return;

    const blockedStatuses: AdmissionSubmissionStatus[] = [
      AdmissionSubmissionStatus.PENDING,
      AdmissionSubmissionStatus.APPROVED,
      AdmissionSubmissionStatus.REJECTED,
    ];

    if (blockedStatuses.includes(latestSubmission.status)) {
      throw new BadRequestException(
        `Submission mới nhất đang ở trạng thái ${latestSubmission.status}, không thể submit`,
      );
    }
  }

  private async getMyApplicationOrFail(userId: string) {
    const application = await this.applicationRepo.findOne({
      where: { outstandingIndividualId: userId },
      order: { createdAt: 'DESC' },
    });

    if (!application) {
      throw new NotFoundException(
        'Không tìm thấy hồ sơ kết nạp của người dùng hiện tại',
      );
    }

    return application;
  }

  private async getMyStepOrFail(
    applicationId: string,
    stepCode: AdmissionWorkflowStep,
  ) {
    const step = await this.stepRepo.findOne({
      where: {
        applicationId,
        stepCode,
      },
    });

    if (!step) {
      throw new NotFoundException('Không tìm thấy bước xử lý');
    }

    return step;
  }

  private async getLatestSubmission(
    applicationId: string,
    stepId: string,
  ): Promise<PartyAdmissionStepSubmissionEntity | null> {
    return this.submissionRepo.findOne({
      where: {
        applicationId,
        stepId,
        isLatest: true,
      },
      order: {
        version: 'DESC',
      },
    });
  }

  private async getMaxVersion(
    applicationId: string,
    stepId: string,
  ): Promise<number> {
    const latest = await this.submissionRepo.findOne({
      where: {
        applicationId,
        stepId,
      },
      order: {
        version: 'DESC',
      },
    });

    return latest?.version ?? 0;
  }

  async saveDraftStep(
    user: {
      id: string;
      role?: { name?: string } | string;
      roleName?: string;
    },
    stepCode: AdmissionWorkflowStep,
    dto: SaveStepDraftDto,
  ): Promise<PartyAdmissionStepSubmissionEntity> {
    this.validateQcutRole(user);

    const application = await this.getMyApplicationOrFail(user.id);
    this.validateApplicationEditable(application);

    const step = await this.getMyStepOrFail(application.id, stepCode);
    this.validateStepEditableForDraft(step);

    const latestSubmission = await this.getLatestSubmission(
      application.id,
      step.id,
    );
    this.validateLatestSubmissionForDraft(latestSubmission);

    let draftSubmission: PartyAdmissionStepSubmissionEntity;

    if (
      latestSubmission &&
      latestSubmission.status === AdmissionSubmissionStatus.DRAFT
    ) {
      draftSubmission = latestSubmission;
      draftSubmission.formData = dto.formData ?? draftSubmission.formData;
      draftSubmission.note = dto.note ?? draftSubmission.note;
      draftSubmission.submittedById = user.id;
      draftSubmission.lastSavedAt = new Date();
    } else {
      if (latestSubmission?.isLatest) {
        latestSubmission.isLatest = false;
        await this.submissionRepo.save(latestSubmission);
      }

      const nextVersion = (await this.getMaxVersion(application.id, step.id)) + 1;

      draftSubmission = this.submissionRepo.create({
        applicationId: application.id,
        stepId: step.id,
        stepCode: step.stepCode,
        version: nextVersion,
        status: AdmissionSubmissionStatus.DRAFT,
        formData: dto.formData,
        note: dto.note,
        submittedById: user.id,
        isLatest: true,
        lastSavedAt: new Date(),
      });
    }

    const savedDraft = await this.submissionRepo.save(draftSubmission);

    if (
      step.status === AdmissionWorkflowStepStatus.NOT_STARTED ||
      step.status === AdmissionWorkflowStepStatus.RETURNED
    ) {
      step.status = AdmissionWorkflowStepStatus.DRAFT;
    }

    if (!step.startedAt) {
      step.startedAt = new Date();
    }

    step.isLocked = false;
    await this.stepRepo.save(step);

    if (application.overallStatus === AdmissionOverallStatus.DRAFT) {
      application.overallStatus = AdmissionOverallStatus.IN_PROGRESS;
      application.currentStepStatus = step.status;
      await this.applicationRepo.save(application);
    }

    return savedDraft;
  }

  async submitStep(
    user: {
      id: string;
      role?: { name?: string } | string;
      roleName?: string;
    },
    stepCode: AdmissionWorkflowStep,
    dto: SubmitStepDto,
  ): Promise<PartyAdmissionStepSubmissionEntity> {
    this.validateQcutRole(user);

    const application = await this.getMyApplicationOrFail(user.id);
    this.validateApplicationEditable(application);

    const step = await this.getMyStepOrFail(application.id, stepCode);
    this.validateStepEditableForSubmit(step);

    const latestSubmission = await this.getLatestSubmission(
      application.id,
      step.id,
    );
    this.validateLatestSubmissionForSubmit(latestSubmission);

    let submissionToSubmit: PartyAdmissionStepSubmissionEntity;

    if (
      latestSubmission &&
      latestSubmission.status === AdmissionSubmissionStatus.DRAFT
    ) {
      submissionToSubmit = latestSubmission;
      submissionToSubmit.formData = dto.formData ?? submissionToSubmit.formData;
      submissionToSubmit.note = dto.note ?? submissionToSubmit.note;
    } else {
      if (latestSubmission?.isLatest) {
        latestSubmission.isLatest = false;
        await this.submissionRepo.save(latestSubmission);
      }

      const nextVersion = (await this.getMaxVersion(application.id, step.id)) + 1;

      submissionToSubmit = this.submissionRepo.create({
        applicationId: application.id,
        stepId: step.id,
        stepCode: step.stepCode,
        version: nextVersion,
        formData: dto.formData,
        note: dto.note,
        submittedById: user.id,
        isLatest: true,
      });
    }

    if (!submissionToSubmit.formData) {
      throw new BadRequestException('Không có dữ liệu để submit');
    }

    submissionToSubmit.status = AdmissionSubmissionStatus.PENDING;
    submissionToSubmit.submittedById = user.id;
    submissionToSubmit.submittedAt = new Date();

    const savedSubmission = await this.submissionRepo.save(submissionToSubmit);

    step.status = AdmissionWorkflowStepStatus.PENDING;
    step.submittedAt = new Date();
    step.isLocked = true;
    if (!step.startedAt) {
      step.startedAt = new Date();
    }
    await this.stepRepo.save(step);

    application.overallStatus = AdmissionOverallStatus.IN_PROGRESS;
    application.currentStepCode = step.stepCode;
    application.currentStepStatus = AdmissionWorkflowStepStatus.PENDING;
    await this.applicationRepo.save(application);

    return savedSubmission;
  }
}