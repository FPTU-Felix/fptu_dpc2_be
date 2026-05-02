import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdmissionApplicationService } from './admission-application.service';
import { PartyAdmissionApplicationEntity } from '../entities/party-admission-application.entity';
import { PartyAdmissionStepEntity } from '../entities/party-admission-step.entity';
import { PartyAdmissionStepSubmissionEntity } from '../entities/party-admission-step-submission.entity';
import { PartyAdmissionStepReviewEntity } from '../entities/party-admission-step-review.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Role } from 'src/modules/roles/entities/role.entity';
import { AdmissionOverallStatus } from '../enum/admission-overall-status';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
import { AdmissionDocumentType } from '../enum/admission-document-type.enum';
import { AdmissionReviewAction } from '../enum/party-admissions.enum';

describe('AdmissionApplicationService (Review Logic)', () => {
  let service: AdmissionApplicationService;
  let applicationRepo: any;
  let stepRepo: any;
  let submissionRepo: any;
  let userRepo: any;
  let roleRepo: any;

  // Giả lập EntityManager cho Transaction
  const mockManager = {
    getRepository: jest.fn().mockImplementation((entity) => {
      if (entity === PartyAdmissionApplicationEntity) return applicationRepo;
      if (entity === PartyAdmissionStepEntity) return stepRepo;
      if (entity === PartyAdmissionStepSubmissionEntity) return submissionRepo;
      if (entity === PartyAdmissionStepReviewEntity)
        return { create: jest.fn((d) => d), save: jest.fn() };
      if (entity === User) return userRepo;
      if (entity === Role) return roleRepo;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionApplicationService,
        {
          provide: getRepositoryToken(PartyAdmissionApplicationEntity),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(PartyAdmissionStepEntity),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(PartyAdmissionStepSubmissionEntity),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(PartyAdmissionStepReviewEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        { provide: getRepositoryToken(Role), useValue: { findOne: jest.fn() } },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
          },
        },
      ],
    }).compile();

    service = module.get<AdmissionApplicationService>(
      AdmissionApplicationService,
    );
    applicationRepo = module.get(
      getRepositoryToken(PartyAdmissionApplicationEntity),
    );
    stepRepo = module.get(getRepositoryToken(PartyAdmissionStepEntity));
    submissionRepo = module.get(
      getRepositoryToken(PartyAdmissionStepSubmissionEntity),
    );
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
  });

  // --- Test Group: approveStep ---
  describe('approveStep', () => {
    const appId = 'app-uuid';
    const reviewerId = 'admin-uuid';

    it(' Duyệt thành công và chuyển sang step tiếp theo', async () => {
      applicationRepo.findOne.mockResolvedValue({
        id: appId,
        currentStepCode: AdmissionWorkflowStep.CHI_UY_REVIEW,
      });

      const currentStep = {
        id: 's2',
        stepOrder: 2,
        stepCode: AdmissionWorkflowStep.CHI_UY_REVIEW,
      };
      const nextStep = {
        id: 's3',
        stepOrder: 3,
        stepCode: AdmissionWorkflowStep.PBT_CONTENT_REVIEW,
      };

      stepRepo.findOne
        .mockResolvedValueOnce(currentStep)
        .mockResolvedValueOnce(nextStep);

      const result = await service.approveStep(appId, reviewerId, {
        stepCode: AdmissionWorkflowStep.CHI_UY_REVIEW,
        note: 'OK',
      });

      expect(result.done).toBe(false);
      expect(currentStep.status).toBe(AdmissionWorkflowStepStatus.COMPLETED);
      expect(nextStep.isCurrent).toBe(true);
    });

    it(' Duyệt bước cuối cùng - Hồ sơ thành APPROVED và thăng cấp User Role', async () => {
      applicationRepo.findOne.mockResolvedValue({
        id: appId,
        currentStepCode: AdmissionWorkflowStep.SECRETARY_RESOLUTION_REVIEW,
        outstandingIndividualId: 'user-1',
      });

      stepRepo.findOne.mockResolvedValueOnce({ id: 's7', stepOrder: 7 }); // Current Step
      stepRepo.findOne.mockResolvedValueOnce(null); // Không còn step tiếp theo

      userRepo.findOne.mockResolvedValue({ id: 'user-1', roleId: 'old-role' });
      roleRepo.findOne.mockResolvedValue({
        id: 'party-member-id',
        name: 'PARTY_MEMBER',
      });

      const result = await service.approveStep(appId, reviewerId, {
        stepCode: AdmissionWorkflowStep.SECRETARY_RESOLUTION_REVIEW,
      });

      expect(result.done).toBe(true);
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ roleId: 'party-member-id' }),
      );
    });

    it(' Sai step hiện tại (Current Step Code mismatch)', async () => {
      applicationRepo.findOne.mockResolvedValue({
        id: appId,
        currentStepCode: AdmissionWorkflowStep.APPLICATION,
      });

      await expect(
        service.approveStep(appId, reviewerId, {
          stepCode: AdmissionWorkflowStep.CHI_UY_REVIEW,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- Test Group: returnStep ---
  describe('returnStep', () => {
    it(' Trả hồ sơ về bước trước đó hợp lệ', async () => {
      applicationRepo.findOne.mockResolvedValue({ id: 'app-1' });
      const current = {
        id: 's3',
        stepOrder: 3,
        stepCode: AdmissionWorkflowStep.PBT_CONTENT_REVIEW,
      };
      const target = {
        id: 's1',
        stepOrder: 1,
        stepCode: AdmissionWorkflowStep.APPLICATION,
      };

      stepRepo.findOne
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(target);

      await service.returnStep('app-1', 'reviewer-1', {
        stepCode: AdmissionWorkflowStep.PBT_CONTENT_REVIEW,
        returnToStepCode: AdmissionWorkflowStep.APPLICATION,
        reason: 'Thiếu thông tin',
      });

      expect(current.status).toBe(AdmissionWorkflowStepStatus.RETURNED);
      expect(target.isCurrent).toBe(true);
      expect(target.status).toBe(AdmissionWorkflowStepStatus.IN_PROGRESS);
    });

    it(' Trả về bước phía sau hoặc bằng bước hiện tại (Invalid Order)', async () => {
      applicationRepo.findOne.mockResolvedValue({ id: 'app-1' });
      const current = { id: 's2', stepOrder: 2 };
      const target = { id: 's3', stepOrder: 3 }; // Step phía sau

      stepRepo.findOne
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(target);

      await expect(
        service.returnStep('app-1', 'rev-1', {
          stepCode: AdmissionWorkflowStep.CHI_UY_REVIEW,
          returnToStepCode: AdmissionWorkflowStep.PBT_CONTENT_REVIEW,
          reason: 'Lỗi',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- Test Group: rejectStep ---
  describe('rejectStep', () => {
    it(' Từ chối hồ sơ - Trạng thái tổng chuyển sang REJECTED', async () => {
      const app = {
        id: 'app-1',
        overallStatus: AdmissionOverallStatus.IN_PROGRESS,
      };
      applicationRepo.findOne.mockResolvedValue(app);
      stepRepo.findOne.mockResolvedValue({ id: 's1' });

      await service.rejectStep('app-1', 'rev-1', {
        stepCode: AdmissionWorkflowStep.APPLICATION,
        reason: 'Không đủ tiêu chuẩn',
      });

      expect(app.overallStatus).toBe(AdmissionOverallStatus.REJECTED);
    });
  });

  // --- Test Group: submitResolutionDraft ---
  describe('submitResolutionDraft', () => {
    it(' Role không phải COMMITTEE_MEMBER thì không được nộp nghị quyết', async () => {
      const user = { sub: 'u1', roleName: 'QCUT' }; // Sai Role
      await expect(
        service.submitResolutionDraft('app-1', user, { formData: {} }),
      ).rejects.toThrow(Error); // Sẽ throw ForbiddenException
    });

    it(' Chi uỷ nộp nghị quyết - chuyển step sang Duyệt nghị quyết', async () => {
      const user = { sub: 'u1', roleName: 'COMMITTEE_MEMBER' };
      applicationRepo.findOne.mockResolvedValue({
        id: 'app-1',
        overallStatus: AdmissionOverallStatus.IN_PROGRESS,
        currentStepCode: AdmissionWorkflowStep.RESOLUTION_DRAFTING,
      });
      const currentStep = {
        id: 's6',
        stepOrder: 6,
        isCurrent: true,
        stepCode: AdmissionWorkflowStep.RESOLUTION_DRAFTING,
      };
      const nextStep = { id: 's7', stepOrder: 7 };

      stepRepo.findOne.mockResolvedValue(currentStep);
      // Mock cho getNextStep bên trong logic service
      stepRepo.findOne
        .mockResolvedValueOnce(currentStep)
        .mockResolvedValueOnce(nextStep);

      const dto = {
        formData: {
          [AdmissionDocumentType.NGHI_QUYET_KET_NAP_DU_THAO]: 'file_url',
        },
      };
      submissionRepo.findOne.mockResolvedValue(null);
      submissionRepo.create.mockImplementation((payload) => payload);
      submissionRepo.save.mockResolvedValue({
        id: 'sub-1',
        ...dto.formData,
        applicationId: 'app-1',
        stepId: currentStep.id,
        stepCode: currentStep.stepCode,
        version: 1,
        submittedById: user.sub,
        submittedAt: new Date(),
        isLatest: true,
      });

      const result = await service.submitResolutionDraft('app-1', user, dto);

      expect(result).toMatchObject({
        applicationId: 'app-1',
        stepId: currentStep.id,
        stepCode: currentStep.stepCode,
        version: 1,
        isLatest: true,
      });
      expect(nextStep.isCurrent).toBe(true);
      expect(nextStep.status).toBe(AdmissionWorkflowStepStatus.IN_PROGRESS);
    });
  });
});
