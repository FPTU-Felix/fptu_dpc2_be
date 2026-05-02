import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AdmissionApplicationService } from './admission-application.service';
import { PartyAdmissionApplicationEntity } from '../entities/party-admission-application.entity';
import { PartyAdmissionStepEntity } from '../entities/party-admission-step.entity';
import { PartyAdmissionStepSubmissionEntity } from '../entities/party-admission-step-submission.entity';
import { PartyAdmissionStepReviewEntity } from '../entities/party-admission-step-review.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Role } from 'src/modules/roles/entities/role.entity';
import { DataSource } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AdmissionOverallStatus } from '../enum/admission-overall-status';

describe('AdmissionApplicationService (Queries)', () => {
  let service: AdmissionApplicationService;
  let applicationRepo: Repository<PartyAdmissionApplicationEntity>;
  let stepRepo: Repository<PartyAdmissionStepEntity>;
  let userRepo: Repository<User>;

  // Mock Repository Factory
  const mockRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionApplicationService,
        {
          provide: getRepositoryToken(PartyAdmissionApplicationEntity),
          useFactory: mockRepo,
        },
        {
          provide: getRepositoryToken(PartyAdmissionStepEntity),
          useFactory: mockRepo,
        },
        {
          provide: getRepositoryToken(PartyAdmissionStepSubmissionEntity),
          useFactory: mockRepo,
        },
        {
          provide: getRepositoryToken(PartyAdmissionStepReviewEntity),
          useFactory: mockRepo,
        },
        { provide: getRepositoryToken(User), useFactory: mockRepo },
        { provide: getRepositoryToken(Role), useFactory: mockRepo },
        { provide: DataSource, useValue: {} }, // Không dùng transaction trong query
      ],
    }).compile();

    service = module.get<AdmissionApplicationService>(
      AdmissionApplicationService,
    );
    applicationRepo = module.get(
      getRepositoryToken(PartyAdmissionApplicationEntity),
    );
    stepRepo = module.get(getRepositoryToken(PartyAdmissionStepEntity));
    userRepo = module.get(getRepositoryToken(User));
  });

  // --- Test Group: getMyCurrentStatus ---
  describe('getMyCurrentStatus', () => {
    const userId = 'user-123';

    it(' Nên trả về trạng thái hồ sơ đầy đủ khi hồ sơ tồn tại', async () => {
      const mockApp = {
        id: 'app-1',
        outstandingIndividualId: userId,
        overallStatus: AdmissionOverallStatus.IN_PROGRESS,
      };
      applicationRepo.findOne = jest.fn().mockResolvedValue(mockApp);
      stepRepo.find = jest.fn().mockResolvedValue([]);

      // Chúng ta mock các repo khác là mảng rỗng để tránh lỗi mapping
      const result = await service.getMyCurrentStatus(userId);

      expect(result).toBeDefined();
      expect(result.applicationId).toBe('app-1');
      expect(applicationRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { outstandingIndividualId: userId },
        }),
      );
    });

    it(' Nên throw NotFoundException nếu người dùng không có hồ sơ', async () => {
      applicationRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.getMyCurrentStatus(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it(' Nếu người dùng có nhiều hồ sơ, phải lấy hồ sơ mới nhất (DESC)', async () => {
      // Logic này nằm ở tham số truyền vào findOne, ta check call arguments
      applicationRepo.findOne = jest
        .fn()
        .mockResolvedValue({ id: 'latest-app' });
      stepRepo.find = jest.fn().mockResolvedValue([]);

      await service.getMyCurrentStatus(userId);

      expect(applicationRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        }),
      );
    });
  });

  // --- Test Group: getMyCurrentStatusWithRoleCheck ---
  describe('getMyCurrentStatusWithRoleCheck', () => {
    it(' Role không hợp lệ (ví dụ: ADMIN) nên bị Forbidden', async () => {
      const user = { sub: 'u1', roleName: 'ADMIN' };

      await expect(
        service.getMyCurrentStatusWithRoleCheck(user),
      ).rejects.toThrow(ForbiddenException);
    });

    it(' Role hợp lệ (QCUT) nên gọi tiếp getMyCurrentStatus', async () => {
      const user = { sub: 'u1', roleName: 'QCUT' };
      // Spy vào chính method trong class
      const spy = jest
        .spyOn(service, 'getMyCurrentStatus')
        .mockResolvedValue({ applicationId: 'app-1' } as any);
      userRepo.findOne = jest
        .fn()
        .mockResolvedValue({ id: 'u1', role: { name: 'QCUT' } });

      await service.getMyCurrentStatusWithRoleCheck(user);
      expect(spy).toHaveBeenCalled();
    });
  });

  // --- Test Group: getApplicationList (Sử dụng QueryBuilder) ---
  describe('getApplicationList', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      applicationRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);
    });

    it(' Phân trang mặc định khi không truyền page/limit', async () => {
      await service.getApplicationList({});

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it(' Tính toán skip đúng khi ở trang 3', async () => {
      await service.getApplicationList({ page: 3, limit: 5 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (3-1)*5
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it(' Keyword search nên áp dụng ILIKE vào nhiều field', async () => {
      await service.getApplicationList({ keyword: 'Văn A' });

      // Kiểm tra xem có gọi andWhere với Brackets không
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it(' Trả về items rỗng và total 0 nếu không có kết quả', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.getApplicationList({});
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // --- Test Group: getMyPendingApplications (Logic phân quyền bước) ---
  describe('getMyPendingApplications', () => {
    it(' COMMITTEE_MEMBER chỉ thấy các bước CHI_UY_REVIEW và RESOLUTION_DRAFTING', async () => {
      const user = { sub: 'u1', roleName: 'COMMITTEE_MEMBER' };
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      applicationRepo.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      await service.getMyPendingApplications(user, {});

      // Kiểm tra filter processableSteps
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'application.currentStepCode IN (:...processableSteps)',
        expect.objectContaining({
          processableSteps: expect.arrayContaining([
            'CHI_UY_REVIEW',
            'RESOLUTION_DRAFTING',
          ]),
        }),
      );
    });

    it(' Role không có trong bản đồ quy trình (ví dụ: GUEST) trả về danh sách rỗng', async () => {
      const user = { sub: 'u1', roleName: 'GUEST' };
      const result = await service.getMyPendingApplications(user, {});
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
