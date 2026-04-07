import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { PartyAdmissionApplicationEntity } from '../entities/party-admission-application.entity';
import { PartyAdmissionStepEntity } from '../entities/party-admission-step.entity';
import { PartyAdmissionStepReviewEntity } from '../entities/party-admission-step-review.entity';
import { PartyAdmissionStepSubmissionEntity } from '../entities/party-admission-step-submission.entity';

import { AdmissionOverallStatus } from '../enum/admission-overall-status';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
import { AdmissionReviewAction } from '../enum/party-admissions.enum';

import { SaveStepDraftDto } from '../dto/request/save-step-draft.dto';
import { SubmitStepDto } from '../dto/request/submit-step.dto';
import { ApproveStepDto } from '../dto/approve-step.dto';
import { ReturnStepDto } from '../dto/return-step.dto';
import { RejectStepDto } from '../dto/reject-step.dto';

import {
  MyAdmissionCurrentStatusResponseDto,
  MyAdmissionStepResponseDto,
  MyAdmissionStepReviewResponseDto,
  MyAdmissionStepSubmissionResponseDto,
} from '../dto/response/my-admission-current-status.response.dto';

import { AdmissionApplicationDetailDto } from '../dto/admission-detail-step.dto';
import { GetAdmissionApplicationListQueryDto } from '../dto/response/get-admission-application-list-query.dto';
import { AdmissionApplicationListResponseDto } from '../dto/response/admission-application-list-item.dto';
import { AdmissionDocumentType } from '../enum/admission-document-type.enum';
import { PartyAdmissionDocumentEntity } from '../entities/party-admission-document.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Role } from 'src/modules/roles/entities/role.entity';

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

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

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

  private getRoleName(user: {
    sub: string;
    role?: { name?: string } | string;
    roleName?: string;
  }): string | undefined {
    return (
      user.roleName ||
      (typeof user.role === 'string' ? user.role : user.role?.name)
    );
  }

  private validateQcutRole(user: {
    sub: string;
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
      AdmissionWorkflowStepStatus.IN_PROGRESS,
      AdmissionWorkflowStepStatus.RETURNED,
    ];

    if (!allowedStatuses.includes(step.status)) {
      throw new BadRequestException(
        `Bước hiện tại đang ở trạng thái ${step.status}, không thể submit`,
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

  async initAdmissionForQCUT(userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const applicationRepo = manager.getRepository(
        PartyAdmissionApplicationEntity,
      );
      const stepRepo = manager.getRepository(PartyAdmissionStepEntity);

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

      const application = applicationRepo.create({
        code: this.generateApplicationCode(),
        outstandingIndividualId: userId,
        overallStatus: AdmissionOverallStatus.DRAFT,
        currentStepCode: AdmissionWorkflowStep.APPLICATION,
        currentStepStatus: AdmissionWorkflowStepStatus.IN_PROGRESS,
        isLocked: false,
      });

      const savedApplication = await applicationRepo.save(application);

      const stepsPayload: Partial<PartyAdmissionStepEntity>[] = [
        {
          applicationId: savedApplication.id,
          stepCode: AdmissionWorkflowStep.APPLICATION,
          stepName: 'Nộp hồ sơ',
          stepOrder: 1,
          status: AdmissionWorkflowStepStatus.IN_PROGRESS,
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
    sub: string; // ID được lấy từ sub
    roleName: string; // roleName của user
  }): Promise<MyAdmissionCurrentStatusResponseDto> {
    // Lấy roleName từ user
    const roleName = user.roleName;

    // Kiểm tra quyền truy cập của người dùng
    const allowedRoles = ['OUTSTANDING_INDIVIDUAL', 'QCUT'];

    if (!roleName || !allowedRoles.includes(roleName)) {
      throw new ForbiddenException(
        'Chỉ QCUT / OUTSTANDING_INDIVIDUAL mới được truy cập API này',
      );
    }

    // Nếu role hợp lệ, gọi phương thức để lấy trạng thái của user
    return this.getMyCurrentStatus(user.sub);  // Sử dụng sub làm ID
  }

  async saveDraftStep(
    user: {
      sub: string;
      role?: { name?: string } | string;
      roleName?: string;
    },
    stepCode: AdmissionWorkflowStep,
    dto: SaveStepDraftDto,
  ): Promise<PartyAdmissionStepSubmissionEntity> {
    this.validateQcutRole(user);

    const application = await this.getMyApplicationOrFail(user.sub);
    this.validateApplicationEditable(application);

    const step = await this.getMyStepOrFail(application.id, stepCode);
    this.validateStepEditableForDraft(step);

    if (!dto.formData || Object.keys(dto.formData).length === 0) {
      throw new BadRequestException('Không có dữ liệu để lưu nháp');
    }

    return this.dataSource.transaction(async (manager) => {
      const submissionRepo = manager.getRepository(
        PartyAdmissionStepSubmissionEntity,
      );
      const stepRepo = manager.getRepository(PartyAdmissionStepEntity);
      const applicationRepo = manager.getRepository(
        PartyAdmissionApplicationEntity,
      );

      const latestSubmission = await submissionRepo.findOne({
        where: {
          applicationId: application.id,
          stepId: step.id,
          isLatest: true,
        },
        order: {
          version: 'DESC',
        },
      });

      let draftSubmission: PartyAdmissionStepSubmissionEntity;

      if (latestSubmission && !latestSubmission.submittedAt) {
        const mergedFormData = {
          ...(latestSubmission.formData ?? {}),
          ...(dto.formData ?? {}),
        };

        latestSubmission.formData = mergedFormData;
        latestSubmission.submittedById = user.sub;
        draftSubmission = latestSubmission;
      } else {
        if (latestSubmission) {
          latestSubmission.isLatest = false;
          await submissionRepo.save(latestSubmission);
        }

        const nextVersion =
          (await this.getMaxVersion(application.id, step.id)) + 1;

        const mergedFormData = {
          ...(latestSubmission?.formData ?? {}),
          ...(dto.formData ?? {}),
        };

        draftSubmission = submissionRepo.create({
          applicationId: application.id,
          stepId: step.id,
          stepCode: step.stepCode,
          version: nextVersion,
          formData: mergedFormData,
          submittedById: user.sub,
          isLatest: true,
        });
      }

      const savedDraft = await submissionRepo.save(draftSubmission);

      if (
        step.status === AdmissionWorkflowStepStatus.NOT_STARTED ||
        step.status === AdmissionWorkflowStepStatus.RETURNED
      ) {
        step.status = AdmissionWorkflowStepStatus.IN_PROGRESS;
      }

      if (!step.startedAt) {
        step.startedAt = new Date();
      }

      step.isLocked = false;
      await stepRepo.save(step);

      if (application.overallStatus === AdmissionOverallStatus.DRAFT) {
        application.currentStepStatus = step.status;
        await applicationRepo.save(application);
      }

      return savedDraft;
    });
  }

  async submitStep(
    user: {
      sub: string;
      role?: { name?: string } | string;
      roleName?: string;
    },
    stepCode: AdmissionWorkflowStep,
    dto: SubmitStepDto = {},
  ): Promise<PartyAdmissionStepSubmissionEntity> {
    this.validateQcutRole(user);
    this.validateQcutSubmittableStep(stepCode);

    const application = await this.getMyApplicationOrFail(user.sub);
    this.validateApplicationEditable(application);
    this.validateApplicationCurrentStep(application, stepCode);

    const step = await this.getMyStepOrFail(application.id, stepCode);
    this.validateStepEditableForSubmit(step);

    return this.dataSource.transaction(async (manager) => {
      const submissionRepo = manager.getRepository(
        PartyAdmissionStepSubmissionEntity,
      );
      const stepRepo = manager.getRepository(PartyAdmissionStepEntity);
      const applicationRepo = manager.getRepository(
        PartyAdmissionApplicationEntity,
      );

      const latestSubmission = await submissionRepo.findOne({
        where: {
          applicationId: application.id,
          stepId: step.id,
          isLatest: true,
        },
        order: {
          version: 'DESC',
        },
      });

      // Ưu tiên dữ liệu cũ trước, rồi merge dữ liệu mới nếu có
      const finalFormData: Record<string, any> = {
        ...(latestSubmission?.formData ?? {}),
        ...(dto?.formData ?? {}),
      };

      if (Object.keys(finalFormData).length === 0) {
        throw new BadRequestException(
          'Không có dữ liệu để submit. Vui lòng lưu nháp hoặc gửi formData lên khi submit.',
        );
      }

      // validate giấy tờ bắt buộc theo step
      this.validateRequiredDocumentsFromFormData(
        step.stepCode,
        finalFormData,
      );

      // đóng latest cũ nếu có
      if (latestSubmission) {
        latestSubmission.isLatest = false;
        await submissionRepo.save(latestSubmission);
      }

      const nextVersion = latestSubmission
        ? latestSubmission.version + 1
        : (await this.getMaxVersion(application.id, step.id)) + 1;

      const submissionToSubmit = submissionRepo.create({
        applicationId: application.id,
        stepId: step.id,
        stepCode: step.stepCode,
        version: nextVersion,
        formData: finalFormData,
        submittedById: user.sub,
        submittedAt: new Date(),
        isLatest: true,
      });

      const savedSubmission = await submissionRepo.save(submissionToSubmit);

      if (!step.startedAt) {
        step.startedAt = new Date();
      }

      step.status = AdmissionWorkflowStepStatus.COMPLETED;
      step.submittedAt = new Date();
      step.isLocked = true;
      step.isCompleted = true;
      step.isCurrent = false;

      await stepRepo.save(step);

      const nextStep = await this.getNextStep(
        manager,
        application.id,
        step.stepOrder,
      );

      if (nextStep) {
        nextStep.status = AdmissionWorkflowStepStatus.IN_PROGRESS;
        nextStep.isCurrent = true;
        nextStep.isLocked = false;
        nextStep.isCompleted = false;

        if (!nextStep.startedAt) {
          nextStep.startedAt = new Date();
        }

        await stepRepo.save(nextStep);

        application.currentStepCode = nextStep.stepCode;
        application.currentStepStatus = AdmissionWorkflowStepStatus.IN_PROGRESS;
        application.overallStatus = AdmissionOverallStatus.IN_PROGRESS;
      } else {
        application.currentStepCode = AdmissionWorkflowStep.COMPLETED;
        application.currentStepStatus =
          AdmissionWorkflowStepStatus.COMPLETED;
        application.overallStatus = AdmissionOverallStatus.APPROVED;
        (application as any).approvedAt = new Date();
      }

      await applicationRepo.save(application);

      return savedSubmission;
    });
  }

  async getApplicationList(
    query: GetAdmissionApplicationListQueryDto,
  ): Promise<AdmissionApplicationListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.applicationRepo
      .createQueryBuilder('application')
      .leftJoin(
        PartyAdmissionStepEntity,
        'currentStep',
        'currentStep.applicationId = application.id AND currentStep.stepCode = application.currentStepCode',
      )
      .where('application.overallStatus <> :draftStatus', {
        draftStatus: AdmissionOverallStatus.DRAFT,
      });

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('application.code ILIKE :keyword', { keyword })
            .orWhere(
              'CAST(application."outstandingIndividualId" AS TEXT) ILIKE :keyword',
              { keyword },
            );
        }),
      );
    }

    if (query.overallStatus) {
      qb.andWhere('application.overallStatus = :overallStatus', {
        overallStatus: query.overallStatus,
      });
    }

    if (query.currentStepCode) {
      qb.andWhere('application.currentStepCode = :currentStepCode', {
        currentStepCode: query.currentStepCode,
      });
    }

    if (query.currentStepStatus) {
      qb.andWhere('application.currentStepStatus = :currentStepStatus', {
        currentStepStatus: query.currentStepStatus,
      });
    }

    qb.orderBy('application.createdAt', 'DESC').skip(skip).take(limit);

    const [applications, total] = await qb.getManyAndCount();

    const currentSteps = applications.length
      ? await this.stepRepo.find({
        where: applications.map((application) => ({
          applicationId: application.id,
          stepCode: application.currentStepCode,
        })),
      })
      : [];

    const currentStepMap = new Map(
      currentSteps.map((step) => [`${step.applicationId}_${step.stepCode}`, step]),
    );

    const items = applications.map((application) => {
      const currentStep = currentStepMap.get(
        `${application.id}_${application.currentStepCode}`,
      );

      return {
        id: application.id,
        code: application.code,
        outstandingIndividualId: application.outstandingIndividualId,
        overallStatus: application.overallStatus,
        currentStepCode: application.currentStepCode,
        currentStepStatus: application.currentStepStatus,
        currentStepName: currentStep?.stepName,
        currentHandler: currentStep?.assignedToId ?? currentStep?.note,
        createdAt: application.createdAt,
        submittedAt: (application as any).submittedAt,
        approvedAt: (application as any).approvedAt,
        rejectedAt: (application as any).rejectedAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getApplicationDetail(
    applicationId: string,
  ): Promise<AdmissionApplicationDetailDto> {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Không tìm thấy hồ sơ');
    }

    const [steps, submissions, reviews] = await Promise.all([
      this.stepRepo.find({
        where: { applicationId },
        order: { stepOrder: 'ASC' },
      }),
      this.submissionRepo.find({
        where: { applicationId },
        order: { version: 'DESC' },
      }),
      this.reviewRepo.find({
        where: { applicationId },
        order: { processedAt: 'DESC' },
      }),
    ]);

    return {
      id: application.id,
      code: application.code,
      outstandingIndividualId: application.outstandingIndividualId,
      overallStatus: application.overallStatus,
      currentStepCode: application.currentStepCode,
      currentStepStatus: application.currentStepStatus,
      createdAt: application.createdAt,
      submittedAt: (application as any).submittedAt,
      approvedAt: (application as any).approvedAt,
      rejectedAt: (application as any).rejectedAt,
      steps: steps.map((step) => {
        const stepSubmissions = submissions.filter(
          (submission) => submission.stepId === step.id,
        );
        const stepReviews = reviews.filter(
          (review) => review.stepId === step.id,
        );

        return {
          stepCode: step.stepCode,
          stepName: step.stepName,
          stepOrder: step.stepOrder,
          status: step.status,
          isCurrent: step.isCurrent,
          isLocked: step.isLocked,
          startedAt: step.startedAt,
          completedAt: step.completedAt,
          note: step.note,
          submissions: stepSubmissions,
          reviews: stepReviews,
        };
      }),
    } as AdmissionApplicationDetailDto;
  }

  async approveStep(
    applicationId: string,
    userId: string,
    dto: ApproveStepDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const appRepo = manager.getRepository(PartyAdmissionApplicationEntity);
      const stepRepo = manager.getRepository(PartyAdmissionStepEntity);
      const reviewRepo = manager.getRepository(PartyAdmissionStepReviewEntity);

      const app = await appRepo.findOne({ where: { id: applicationId } });

      if (!app) {
        throw new NotFoundException('Không tìm thấy hồ sơ');
      }

      if (app.currentStepCode !== dto.stepCode) {
        throw new BadRequestException('Sai step hiện tại');
      }

      const step = await stepRepo.findOne({
        where: { applicationId, stepCode: dto.stepCode },
      });

      if (!step) {
        throw new NotFoundException('Không tìm thấy bước hiện tại');
      }

      // log review
      await reviewRepo.save(
        reviewRepo.create({
          applicationId,
          stepId: step.id,
          action: AdmissionReviewAction.APPROVE,
          fromStatus: step.status,
          toStatus: AdmissionWorkflowStepStatus.COMPLETED,
          note: dto.note,
          reviewerId: userId,
          processedAt: new Date(),
        }),
      );

      // complete step hiện tại
      step.status = AdmissionWorkflowStepStatus.COMPLETED;
      step.isCurrent = false;
      step.isCompleted = true;
      step.isLocked = true;
      step.processedById = userId;
      step.processedAt = new Date();
      step.completedAt = new Date();

      await stepRepo.save(step);

      const next = await this.getNextStep(
        manager,
        applicationId,
        step.stepOrder,
      );

      if (!next) {
        app.overallStatus = AdmissionOverallStatus.APPROVED;
        app.currentStepCode = AdmissionWorkflowStep.COMPLETED;
        app.currentStepStatus = AdmissionWorkflowStepStatus.COMPLETED;
        (app as any).approvedAt = new Date();

        await appRepo.save(app);

        await this.promoteToPartyMember(
          app.outstandingIndividualId,
        );

        return { success: true, done: true };
      }

      next.status = AdmissionWorkflowStepStatus.IN_PROGRESS;
      next.isCurrent = true;
      next.isLocked = false;
      next.isCompleted = false;

      if (!next.startedAt) {
        next.startedAt = new Date();
      }

      await stepRepo.save(next);

      app.currentStepCode = next.stepCode;
      app.currentStepStatus = AdmissionWorkflowStepStatus.IN_PROGRESS;
      app.overallStatus = AdmissionOverallStatus.IN_PROGRESS;

      await appRepo.save(app);

      return { success: true, done: false };
    });
  }

  async returnStep(
    applicationId: string,
    userId: string,
    dto: ReturnStepDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const appRepo = manager.getRepository(PartyAdmissionApplicationEntity);
      const stepRepo = manager.getRepository(PartyAdmissionStepEntity);
      const reviewRepo = manager.getRepository(PartyAdmissionStepReviewEntity);

      const app = await appRepo.findOne({ where: { id: applicationId } });
      if (!app) {
        throw new NotFoundException('Không tìm thấy hồ sơ');
      }

      const current = await stepRepo.findOne({
        where: { applicationId, stepCode: dto.stepCode },
      });

      const target = await stepRepo.findOne({
        where: { applicationId, stepCode: dto.returnToStepCode },
      });

      if (!current || !target) {
        throw new BadRequestException('Step không hợp lệ');
      }

      if (target.stepOrder >= current.stepOrder) {
        throw new BadRequestException('Không thể trả về bước phía sau');
      }

      await reviewRepo.save(
        reviewRepo.create({
          applicationId,
          stepId: current.id,
          action: AdmissionReviewAction.RETURN,
          fromStatus: current.status,
          toStatus: AdmissionWorkflowStepStatus.RETURNED,
          reason: dto.reason,
          reviewerId: userId,
          processedAt: new Date(),
        }),
      );

      current.status = AdmissionWorkflowStepStatus.RETURNED;
      current.isCurrent = false;
      current.isLocked = true;
      current.isCompleted = false;
      current.processedById = userId;
      current.processedAt = new Date();
      current.returnedAt = new Date();
      current.note = dto.reason;

      target.status = AdmissionWorkflowStepStatus.IN_PROGRESS;
      target.isCurrent = true;
      target.isLocked = false;
      target.isCompleted = false;

      if (!target.startedAt) {
        target.startedAt = new Date();
      }

      await stepRepo.save([current, target]);

      app.currentStepCode = target.stepCode;
      app.currentStepStatus = AdmissionWorkflowStepStatus.IN_PROGRESS;
      app.overallStatus = AdmissionOverallStatus.RETURNED;

      await appRepo.save(app);

      return { success: true };
    });
  }

  async rejectStep(
    applicationId: string,
    userId: string,
    dto: RejectStepDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const appRepo = manager.getRepository(PartyAdmissionApplicationEntity);
      const stepRepo = manager.getRepository(PartyAdmissionStepEntity);
      const reviewRepo = manager.getRepository(PartyAdmissionStepReviewEntity);

      const app = await appRepo.findOne({ where: { id: applicationId } });
      if (!app) {
        throw new NotFoundException('Không tìm thấy hồ sơ');
      }

      const currentStep = await stepRepo.findOne({
        where: {
          applicationId,
          stepCode: dto.stepCode,
        },
      });

      if (!currentStep) {
        throw new BadRequestException('Không tìm thấy bước cần từ chối');
      }

      await reviewRepo.save(
        reviewRepo.create({
          applicationId,
          stepId: currentStep.id,
          action: AdmissionReviewAction.REJECT,
          fromStatus: currentStep.status,
          toStatus: AdmissionWorkflowStepStatus.REJECTED,
          reason: dto.reason,
          reviewerId: userId,
          processedAt: new Date(),
        }),
      );

      currentStep.status = AdmissionWorkflowStepStatus.REJECTED;
      currentStep.isCurrent = false;
      currentStep.isLocked = true;
      currentStep.isCompleted = false;
      currentStep.processedById = userId;
      currentStep.processedAt = new Date();
      currentStep.note = dto.reason;

      await stepRepo.save(currentStep);

      app.overallStatus = AdmissionOverallStatus.REJECTED;
      app.currentStepCode = dto.stepCode;
      app.currentStepStatus = AdmissionWorkflowStepStatus.REJECTED;
      (app as any).rejectedAt = new Date();

      await appRepo.save(app);

      return { success: true };
    });
  }

  private async getNextStep(
    manager: EntityManager,
    applicationId: string,
    currentStepOrder: number,
  ): Promise<PartyAdmissionStepEntity | null> {
    return manager.getRepository(PartyAdmissionStepEntity).findOne({
      where: {
        applicationId,
        stepOrder: currentStepOrder + 1,
      },
    });
  }

  private validateRequiredDocumentsFromFormData(
    stepCode: AdmissionWorkflowStep,
    formData: Record<string, any>,
  ) {
    const requiredTypes = this.getRequiredDocumentTypesForStep(stepCode);

    if (!requiredTypes.length) {
      return;
    }

    const missingTypes = requiredTypes.filter((type) => {
      const value = formData?.[type];
      return value === undefined || value === null || value === '';
    });

    if (missingTypes.length > 0) {
      throw new BadRequestException({
        message: 'Thiếu giấy tờ bắt buộc để submit',
        missingDocumentTypes: missingTypes,
      });
    }
  }

  private getRequiredDocumentTypesForStep(
    stepCode: AdmissionWorkflowStep,
  ): AdmissionDocumentType[] {
    switch (stepCode) {
      case AdmissionWorkflowStep.APPLICATION:
        return [
          AdmissionDocumentType.DON_XIN_VAO_DANG,
          AdmissionDocumentType.LY_LICH_NGUOI_XIN_VAO_DANG,
          AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_1,
          AdmissionDocumentType.GIAY_GIOI_THIEU_DANG_VIEN_2,
        ];

      case AdmissionWorkflowStep.LOCAL_VERIFICATION:
        return [AdmissionDocumentType.XAC_MINH_DIA_PHUONG];

      case AdmissionWorkflowStep.RESOLUTION_DRAFTING:
        return [AdmissionDocumentType.NGHI_QUYET_KET_NAP_DU_THAO];

      default:
        return [];
    }
  }

  async getMyPendingApplications(
    user: {
      sub: string;
      role?: { name?: string } | string;
      roleName?: string;
    },
    query: GetAdmissionApplicationListQueryDto,
  ): Promise<AdmissionApplicationListResponseDto> {
    const roleName = this.getRoleName(user);

    if (!roleName) {
      throw new ForbiddenException('Không xác định được vai trò người dùng');
    }

    const processableSteps = this.getProcessableStepsByRole(roleName);
    console.log('roleName', roleName);
    console.log('processableSteps', processableSteps);

    if (!processableSteps.length) {
      return {
        items: [],
        total: 0,
        page: query.page ?? 1,
        limit: query.limit ?? 10,
        totalPages: 0,
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.applicationRepo
      .createQueryBuilder('application')
      .leftJoin(
        PartyAdmissionStepEntity,
        'currentStep',
        'currentStep.applicationId = application.id AND currentStep.stepCode = application.currentStepCode',
      )
      .where('application.overallStatus IN (:...overallStatuses)', {
        overallStatuses: [
          AdmissionOverallStatus.IN_PROGRESS,
          AdmissionOverallStatus.RETURNED,
        ],
      })
      .andWhere('application.currentStepCode IN (:...processableSteps)', {
        processableSteps,
      })
      .andWhere('application.currentStepStatus = :currentStepStatus', {
        currentStepStatus: AdmissionWorkflowStepStatus.IN_PROGRESS,
      });

    if (query.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('application.code ILIKE :keyword', { keyword })
            .orWhere(
              'CAST("application"."outstandingIndividualId" AS TEXT) ILIKE :keyword',
              { keyword },
            );
        }),
      );
    }

    qb.orderBy('application.createdAt', 'DESC').skip(skip).take(limit);

    console.log(qb.getQuery());
    console.log(qb.getParameters());

    const [applications, total] = await qb.getManyAndCount();

    const currentSteps = applications.length
      ? await this.stepRepo.find({
        where: applications.map((application) => ({
          applicationId: application.id,
          stepCode: application.currentStepCode,
        })),
      })
      : [];

    const currentStepMap = new Map(
      currentSteps.map((step) => [`${step.applicationId}_${step.stepCode}`, step]),
    );

    const items = applications.map((application) => {
      const currentStep = currentStepMap.get(
        `${application.id}_${application.currentStepCode}`,
      );

      return {
        id: application.id,
        code: application.code,
        outstandingIndividualId: application.outstandingIndividualId,
        overallStatus: application.overallStatus,
        currentStepCode: application.currentStepCode,
        currentStepStatus: application.currentStepStatus,
        currentStepName: currentStep?.stepName,
        currentHandler: currentStep?.assignedToId ?? currentStep?.note,
        createdAt: application.createdAt,
        submittedAt: (application as any).submittedAt,
        approvedAt: (application as any).approvedAt,
        rejectedAt: (application as any).rejectedAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }


  private getProcessableStepsByRole(roleName: string): AdmissionWorkflowStep[] {
    const map: Record<string, AdmissionWorkflowStep[]> = {
      COMMITTEE_MEMBER: [
        AdmissionWorkflowStep.CHI_UY_REVIEW,
        AdmissionWorkflowStep.RESOLUTION_DRAFTING,
      ],
      DEPUTY_SECRETARY: [
        AdmissionWorkflowStep.PBT_CONTENT_REVIEW,
        AdmissionWorkflowStep.RED_SEAL_CHECK,
      ],
      SECRETARY: [
        AdmissionWorkflowStep.SECRETARY_RESOLUTION_REVIEW,
      ],
    };

    return map[roleName] ?? [];
  }
  private canProcessStep(
    roleName: string,
    stepCode: AdmissionWorkflowStep,
  ): boolean {
    return this.getProcessableStepsByRole(roleName).includes(stepCode);
  }

  private async promoteToPartyMember(
    userId: string,
  ) {
    const userRepo = this.userRepo;
    const roleRepo = this.roleRepo;

    const user = await userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    const partyMemberRole = await roleRepo.findOne({
      where: { name: 'PARTY_MEMBER' },
    });

    if (!partyMemberRole) {
      throw new BadRequestException(
        'Chưa cấu hình role PARTY_MEMBER trong hệ thống',
      );
    }

    user.roleId = partyMemberRole.id;

    await userRepo.save(user);

    return user;
  }

  private validateQcutSubmittableStep(stepCode: AdmissionWorkflowStep) {
    const allowedSteps: AdmissionWorkflowStep[] = [
      AdmissionWorkflowStep.APPLICATION,
      AdmissionWorkflowStep.LOCAL_VERIFICATION,
    ];

    if (!allowedSteps.includes(stepCode)) {
      throw new ForbiddenException(
        `QCUT chỉ được submit ở các bước: ${allowedSteps.join(', ')}`,
      );
    }
  }

  private validateApplicationCurrentStep(
    application: PartyAdmissionApplicationEntity,
    stepCode: AdmissionWorkflowStep,
  ) {
    if (application.currentStepCode !== stepCode) {
      throw new BadRequestException(
        `Hồ sơ hiện đang ở bước ${application.currentStepCode}, không phải ${stepCode}`,
      );
    }
  }

  async submitResolutionDraft(
    applicationId: string,
    user: {
      sub: string;
      role?: { name?: string } | string;
      roleName?: string;
    },
    dto: SubmitStepDto = {},
  ): Promise<PartyAdmissionStepSubmissionEntity> {
    const roleName = this.getRoleName(user);

    if (roleName !== 'COMMITTEE_MEMBER') {
      throw new ForbiddenException('Chỉ Chi uỷ mới được gửi nghị quyết');
    }

    return this.dataSource.transaction(async (manager) => {
      const appRepo = manager.getRepository(PartyAdmissionApplicationEntity);
      const stepRepo = manager.getRepository(PartyAdmissionStepEntity);
      const submissionRepo = manager.getRepository(
        PartyAdmissionStepSubmissionEntity,
      );

      // 1. Lấy application
      const application = await appRepo.findOne({
        where: { id: applicationId },
      });

      if (!application) {
        throw new NotFoundException('Không tìm thấy hồ sơ');
      }

      if (
        ![
          AdmissionOverallStatus.IN_PROGRESS,
          AdmissionOverallStatus.RETURNED,
        ].includes(application.overallStatus)
      ) {
        throw new BadRequestException(
          `Hồ sơ đang ở trạng thái ${application.overallStatus}, không thể thao tác`,
        );
      }

      if (
        application.currentStepCode !==
        AdmissionWorkflowStep.RESOLUTION_DRAFTING
      ) {
        throw new BadRequestException(
          'Hồ sơ không ở bước soạn nghị quyết',
        );
      }

      // 2. Lấy step
      const step = await stepRepo.findOne({
        where: {
          applicationId,
          stepCode: AdmissionWorkflowStep.RESOLUTION_DRAFTING,
        },
      });

      if (!step) {
        throw new NotFoundException('Không tìm thấy bước soạn nghị quyết');
      }

      if (!step.isCurrent) {
        throw new BadRequestException('Đây không phải bước hiện tại');
      }

      // 3. Lấy submission cũ
      const latestSubmission = await submissionRepo.findOne({
        where: {
          applicationId,
          stepId: step.id,
          isLatest: true,
        },
        order: {
          version: 'DESC',
        },
      });

      // 4. Merge formData
      const finalFormData: Record<string, any> = {
        ...(latestSubmission?.formData ?? {}),
        ...(dto?.formData ?? {}),
      };

      // 5. Validate có nghị quyết
      const resolutionFile =
        finalFormData[
        AdmissionDocumentType.NGHI_QUYET_KET_NAP_DU_THAO
        ];

      if (!resolutionFile) {
        throw new BadRequestException(
          'Thiếu file nghị quyết dự thảo',
        );
      }

      // 6. Đóng bản cũ
      if (latestSubmission) {
        latestSubmission.isLatest = false;
        await submissionRepo.save(latestSubmission);
      }

      const nextVersion = latestSubmission
        ? latestSubmission.version + 1
        : (await this.getMaxVersion(applicationId, step.id)) + 1;

      // 7. Tạo submission mới
      const newSubmission = submissionRepo.create({
        applicationId,
        stepId: step.id,
        stepCode: step.stepCode,
        version: nextVersion,
        formData: finalFormData,
        submittedById: user.sub,
        submittedAt: new Date(),
        isLatest: true,
      });

      const savedSubmission = await submissionRepo.save(newSubmission);

      // 8. Complete step hiện tại
      step.status = AdmissionWorkflowStepStatus.COMPLETED;
      step.isCurrent = false;
      step.isCompleted = true;
      step.isLocked = true;
      step.submittedAt = new Date();

      if (!step.startedAt) {
        step.startedAt = new Date();
      }

      await stepRepo.save(step);

      // 9. Mở step tiếp theo (Bí thư duyệt)
      const nextStep = await this.getNextStep(
        manager,
        applicationId,
        step.stepOrder,
      );

      if (!nextStep) {
        throw new BadRequestException(
          'Không tìm thấy bước tiếp theo sau nghị quyết',
        );
      }

      nextStep.status = AdmissionWorkflowStepStatus.IN_PROGRESS;
      nextStep.isCurrent = true;
      nextStep.isLocked = false;
      nextStep.isCompleted = false;

      if (!nextStep.startedAt) {
        nextStep.startedAt = new Date();
      }

      await stepRepo.save(nextStep);

      // 10. Update application
      application.currentStepCode = nextStep.stepCode;
      application.currentStepStatus = AdmissionWorkflowStepStatus.IN_PROGRESS;
      application.overallStatus = AdmissionOverallStatus.IN_PROGRESS;

      await appRepo.save(application);

      return savedSubmission;
    });
  }
}