import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartyAdmissionsService } from './party-admissions.service';
import { PartyAdmission } from './entities/party-admission.entity';
import { AdmissionStatusEnum, UserRole } from 'src/common/enums';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('PartyAdmissionsService', () => {
  let service: PartyAdmissionsService;
  let repo: Repository<PartyAdmission>;

  // Mock data
  const mockAdmission = {
    id: 'uuid-123',
    userId: 'user-1',
    status: AdmissionStatusEnum.SUBMITTED,
    admissionDocumentsUrl: 'http://docs.com/1',
    remark: 'Initial remark',
    updatedAt: new Date(),
  };

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartyAdmissionsService,
        {
          provide: getRepositoryToken(PartyAdmission),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PartyAdmissionsService>(PartyAdmissionsService);
    repo = module.get<Repository<PartyAdmission>>(getRepositoryToken(PartyAdmission));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // 1. TEST: TRACK PROGRESS
  // =========================================================
  describe('trackAdmissionProgress', () => {
    it('should return progress if record exists', async () => {
      mockRepo.findOne.mockResolvedValue(mockAdmission);
      const result = await service.trackAdmissionProgress('user-1');
      expect(result.success).toBe(true);
      expect(result.data.statusDisplay).toBe('Đã nộp đơn kết nạp');
    });

    it('should throw NotFoundException if no record found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.trackAdmissionProgress('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================
  // 2. TEST: MANAGE PROGRESS (RBAC & LOGIC)
  // =========================================================
  describe('manageProgress', () => {
    it('Committee Member should be able to approve CHECKED status', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockAdmission, status: AdmissionStatusEnum.SUBMITTED });
      mockRepo.save.mockImplementation((val) => Promise.resolve(val));

      const result = await service.manageProgress('uuid-123', AdmissionStatusEnum.CHECKED, UserRole.COMMITTEE_MEMBER);
      expect(result.status).toBe(AdmissionStatusEnum.CHECKED);
    });

    it('Secretary should be able to verify status', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockAdmission, status: AdmissionStatusEnum.CHECKED });
      mockRepo.save.mockImplementation((val) => Promise.resolve(val));

      const result = await service.manageProgress('uuid-123', AdmissionStatusEnum.VERIFIED, UserRole.SECRETARY);
      expect(result.status).toBe(AdmissionStatusEnum.VERIFIED);
    });
  });

  // =========================================================
  // 3. TEST: SUBMIT DOCUMENTS
  // =========================================================
  describe('submitDocuments', () => {
    it('should update URL and reset status to SUBMITTED', async () => {
      mockRepo.findOne.mockResolvedValue(mockAdmission);
      mockRepo.save.mockImplementation((val) => Promise.resolve(val));

      const result = await service.submitDocuments('uuid-123', 'http://newurl.com');
      expect(result.status).toBe(AdmissionStatusEnum.SUBMITTED);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 4. TEST: READ & DELETE (UPDATED PERMISSIONS)
  // =========================================================
  describe('Read Operations', () => {
    it('findAll: should call repo.find', async () => {
      await service.findAll();
      expect(mockRepo.find).toHaveBeenCalled();
    });
  });
});