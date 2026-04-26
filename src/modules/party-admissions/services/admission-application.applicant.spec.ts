import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdmissionApplicationService } from './admission-application.service';
import { PartyAdmissionApplicationEntity } from '../entities/party-admission-application.entity';
import { PartyAdmissionStepEntity } from '../entities/party-admission-step.entity';
import { PartyAdmissionStepSubmissionEntity } from '../entities/party-admission-step-submission.entity';
import { AdmissionOverallStatus } from '../enum/admission-overall-status';
import { AdmissionWorkflowStep } from '../enum/admission-workflow-step.enum';
import { AdmissionWorkflowStepStatus } from '../enum/admission-workflow-step-status.enum';
import { User } from 'src/modules/users/entities/user.entity';
import { Role } from 'src/modules/roles/entities/role.entity';
import { PartyAdmissionStepReviewEntity } from '../entities/party-admission-step-review.entity';

describe('AdmissionApplicationService (Applicant Logic)', () => {
  let service: AdmissionApplicationService;
  let applicationRepo: any;
  let stepRepo: any;
  let submissionRepo: any;
  let dataSource: DataSource;

  // Giả lập EntityManager để dùng trong Transaction
  const mockManager = {
    getRepository: jest.fn().mockImplementation((entity) => {
      if (entity === PartyAdmissionApplicationEntity) return applicationRepo;
      if (entity === PartyAdmissionStepEntity) return stepRepo;
      if (entity === PartyAdmissionStepSubmissionEntity) return submissionRepo;
    }),
    save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionApplicationService,
        {
          provide: getRepositoryToken(PartyAdmissionApplicationEntity),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(PartyAdmissionStepEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PartyAdmissionStepSubmissionEntity),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Role), useValue: {} },
        {
          provide: getRepositoryToken(PartyAdmissionStepReviewEntity),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {
            // Quan trọng: Cho phép chạy callback bên trong transaction ngay lập tức
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
    dataSource = module.get<DataSource>(DataSource);
  });

  // --- Test Group: initAdmissionForQCUT ---
  describe('initAdmissionForQCUT', () => {
    const userId = 'user-1';

    it(' Nên tạo mới hồ sơ và 7 bước nếu chưa có hồ sơ nào', async () => {
      applicationRepo.findOne.mockResolvedValue(null);
      applicationRepo.create.mockReturnValue({ id: 'new-app-id' });
      applicationRepo.save.mockResolvedValue({ id: 'new-app-id' });
      stepRepo.create.mockReturnValue([]);
      stepRepo.save.mockResolvedValue([]);

      const result = await service.initAdmissionForQCUT(userId);

      expect(result.isNew).toBe(true);
      expect(applicationRepo.create).toHaveBeenCalled();
      // Kiểm tra xem có tạo đủ 7 bước không (thông qua mảng truyền vào create)
      expect(stepRepo.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            stepOrder: 1,
            stepCode: AdmissionWorkflowStep.APPLICATION,
          }),
          expect.objectContaining({ stepOrder: 7 }),
        ]),
      );
    });

    it(' Nên trả về hồ sơ cũ nếu đang trong quá trình xử lý', async () => {
      const existingApp = {
        id: 'old-app',
        overallStatus: AdmissionOverallStatus.DRAFT,
      };
      applicationRepo.findOne.mockResolvedValue(existingApp);
      stepRepo.find.mockResolvedValue([{ id: 'step-1' }]);

      const result = await service.initAdmissionForQCUT(userId);

      expect(result.isNew).toBe(false);
      expect(result.application.id).toBe('old-app');
    });
  });

  // --- Test Group: saveDraftStep ---
  describe('saveDraftStep', () => {
    const user = { sub: 'u1', roleName: 'QCUT' };
    const stepCode = AdmissionWorkflowStep.APPLICATION;

    it(' Không phải QCUT/OUTSTANDING_INDIVIDUAL thì không được lưu', async () => {
      const badUser = { sub: 'u1', roleName: 'SECRETARY' };
      await expect(
        service.saveDraftStep(badUser, stepCode, { formData: { a: 1 } }),
      ).rejects.toThrow(ForbiddenException);
    });

    it(' Lưu nháp lần đầu (chưa có submission) - tạo mới version 1', async () => {
      applicationRepo.findOne.mockResolvedValue({
        id: 'app-1',
        overallStatus: AdmissionOverallStatus.DRAFT,
      });
      stepRepo.findOne.mockResolvedValue({
        id: 's1',
        isCurrent: true,
        status: AdmissionWorkflowStepStatus.NOT_STARTED,
      });
      submissionRepo.findOne.mockResolvedValue(null); // Chưa có submission
      submissionRepo.create.mockReturnValue({ version: 1 });

      await service.saveDraftStep(user, stepCode, {
        formData: { name: 'Anh Vu' },
      });

      expect(submissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 1,
          formData: { name: 'Anh Vu' },
        }),
      );
    });

    it(' Đã có bản nháp chưa submit - nên thực hiện MERGE dữ liệu', async () => {
      applicationRepo.findOne.mockResolvedValue({ id: 'app-1' });
      stepRepo.findOne.mockResolvedValue({
        id: 's1',
        isCurrent: true,
        status: AdmissionWorkflowStepStatus.IN_PROGRESS,
      });

      const oldSubmission = {
        id: 'sub-1',
        formData: { field1: 'val1' },
        submittedAt: null,
      };
      submissionRepo.findOne.mockResolvedValue(oldSubmission);

      await service.saveDraftStep(user, stepCode, {
        formData: { field2: 'val2' },
      });

      // Kiểm tra việc merge: {field1: 'val1', field2: 'val2'}
      expect(oldSubmission.formData).toEqual({
        field1: 'val1',
        field2: 'val2',
      });
      expect(submissionRepo.save).toHaveBeenCalledWith(oldSubmission);
    });
  });

  // --- Test Group: submitStep ---
  describe('submitStep', () => {
    const user = { sub: 'u1', roleName: 'QCUT' };

    it(' Thiếu giấy tờ bắt buộc theo quy định của step', async () => {
      applicationRepo.findOne.mockResolvedValue({
        id: 'app-1',
        currentStepCode: AdmissionWorkflowStep.APPLICATION,
      });
      stepRepo.findOne.mockResolvedValue({
        id: 's1',
        isCurrent: true,
        stepCode: AdmissionWorkflowStep.APPLICATION,
        status: AdmissionWorkflowStepStatus.IN_PROGRESS,
      });

      // Step APPLICATION yêu cầu: DON_XIN_VAO_DANG, LY_LICH...
      // Ở đây ta gửi formData rỗng
      await expect(
        service.submitStep(user, AdmissionWorkflowStep.APPLICATION, {
          formData: {},
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it(' Submit thành công - phải khóa step hiện tại và mở step tiếp theo', async () => {
      applicationRepo.findOne.mockResolvedValue({
        id: 'app-1',
        currentStepCode: AdmissionWorkflowStep.APPLICATION,
        overallStatus: AdmissionOverallStatus.DRAFT,
      });
      const currentStep = {
        id: 's1',
        stepOrder: 1,
        isCurrent: true,
        stepCode: AdmissionWorkflowStep.APPLICATION,
        status: AdmissionWorkflowStepStatus.IN_PROGRESS,
      };
      const nextStep = { id: 's2', stepOrder: 2, isCurrent: false };
      stepRepo.findOne
        .mockResolvedValueOnce(currentStep) // Lần 1 cho getMyStepOrFail
        .mockResolvedValueOnce(nextStep); // Lần 2 cho getNextStep
      const validFormData = {
        DON_XIN_VAO_DANG: 'file_url',
        LY_LICH_NGUOI_XIN_VAO_DANG: 'file_url',
        GIAY_GIOI_THIEU_DANG_VIEN_1: 'file_url',
        GIAY_GIOI_THIEU_DANG_VIEN_2: 'file_url',
      };
      await service.submitStep(user, AdmissionWorkflowStep.APPLICATION, {
        formData: validFormData,
      });
      // 1. Step hiện tại phải xong
      expect(currentStep.status).toBe(AdmissionWorkflowStepStatus.COMPLETED);
      expect(currentStep.isCurrent).toBe(false);

      // 2. Step tiếp theo phải được mở
      expect(nextStep.isCurrent).toBe(true);
      expect(nextStep.status).toBe(AdmissionWorkflowStepStatus.IN_PROGRESS);
    });

    it(' Submit bước cuối cùng - Hồ sơ phải chuyển sang APPROVED', async () => {
      // Giả lập đang ở bước cuối (NextStep trả về null)
      applicationRepo.findOne.mockResolvedValue({
        id: 'app-1',
        currentStepCode: AdmissionWorkflowStep.LOCAL_VERIFICATION,
      });
      stepRepo.findOne.mockResolvedValue({
        id: 's4',
        stepOrder: 4,
        isCurrent: true,
        stepCode: AdmissionWorkflowStep.LOCAL_VERIFICATION,
        status: AdmissionWorkflowStepStatus.IN_PROGRESS,
      });

      // Mock getNextStep trả về null (hết bước) và đảm bảo repo transaction đầy đủ
      mockManager.getRepository = jest.fn().mockImplementation((entity) => {
        if (entity === PartyAdmissionStepEntity) {
          return {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
          };
        }
        if (entity === PartyAdmissionApplicationEntity) {
          return applicationRepo;
        }
        return submissionRepo;
      });

      // Lưu ý: Local verification yêu cầu XAC_MINH_DIA_PHUONG
      await service.submitStep(user, AdmissionWorkflowStep.LOCAL_VERIFICATION, {
        formData: { XAC_MINH_DIA_PHUONG: 'url' },
      });
    });
  });
});
