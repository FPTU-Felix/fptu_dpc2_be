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

  // Mock dữ liệu mẫu cho hồ sơ kết nạp
  const mockAdmission = {
    id: 'uuid-123',
    userId: 'user-1',
    status: AdmissionStatusEnum.SUBMITTED,
    admissionDocumentsUrl: 'http://docs.com/file1.pdf',
    remark: 'Initial remark',
    updatedAt: new Date(),
  };

  // Mock Repository: Chỉ giữ lại các hàm cần thiết cho logic hiện tại
  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
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
  // 1. TEST: THEO DÕI TIẾN ĐỘ (User/QCUT)
  // =========================================================
  describe('trackAdmissionProgress', () => {
    it('nên trả về thông tin tiến độ nếu hồ sơ tồn tại', async () => {
      mockRepo.findOne.mockResolvedValue(mockAdmission);

      const result = await service.trackAdmissionProgress('user-1');
      
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockAdmission.id);
      expect(result.data.statusDisplay).toBe('Đã nộp đơn kết nạp');
    });

    it('nên ném lỗi NotFoundException nếu user chưa có hồ sơ', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.trackAdmissionProgress('unknown-user'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================
  // 2. TEST: QUẢN LÝ TIẾN ĐỘ (RBAC & State Machine)
  // =========================================================
  describe('manageProgress', () => {
    
    it('Chi ủy (COMMITTEE_MEMBER) nên duyệt được hồ sơ sang CHECKED', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockAdmission, status: AdmissionStatusEnum.SUBMITTED });
      mockRepo.save.mockImplementation((val) => Promise.resolve(val));

      const result = await service.manageProgress(
        'uuid-123', 
        AdmissionStatusEnum.CHECKED, 
        UserRole.COMMITTEE_MEMBER
      );

      expect(result.status).toBe(AdmissionStatusEnum.CHECKED);
      expect(result.remark).toBe('Chi ủy đã duyệt nội dung hồ sơ.');
    });

    it('Nên ném lỗi Forbidden nếu Đảng viên thường cố duyệt CHECKED', async () => {
      mockRepo.findOne.mockResolvedValue(mockAdmission);

      await expect(service.manageProgress(
        'uuid-123', 
        AdmissionStatusEnum.CHECKED, 
        UserRole.PARTY_MEMBER
      )).rejects.toThrow(ForbiddenException);
    });

    it('Bí thư (SECRETARY) nên chốt được trạng thái VERIFIED', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockAdmission, status: AdmissionStatusEnum.CHECKED });
      mockRepo.save.mockImplementation((val) => Promise.resolve(val));

      const result = await service.manageProgress(
        'uuid-123', 
        AdmissionStatusEnum.VERIFIED, 
        UserRole.SECRETARY
      );

      expect(result.status).toBe(AdmissionStatusEnum.VERIFIED);
    });

    it('Nên ném lỗi BadRequest nếu duyệt CHECKED khi hồ sơ chưa được nộp (SUBMITTED)', async () => {
      // Giả sử hồ sơ đang ở trạng thái REJECTED (không phải SUBMITTED)
      mockRepo.findOne.mockResolvedValue({ ...mockAdmission, status: AdmissionStatusEnum.REJECTED });

      await expect(service.manageProgress(
        'uuid-123', 
        AdmissionStatusEnum.CHECKED, 
        UserRole.COMMITTEE_MEMBER
      )).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================
  // 3. TEST: NỘP/CẬP NHẬT TÀI LIỆU
  // =========================================================
  describe('submitDocuments', () => {
    it('nên cập nhật URL và reset trạng thái về SUBMITTED', async () => {
      mockRepo.findOne.mockResolvedValue(mockAdmission);
      mockRepo.save.mockImplementation((val) => Promise.resolve(val));

      const newUrl = 'http://updated-docs.com/file.pdf';
      const result = await service.submitDocuments('uuid-123', newUrl);

      expect(result.admissionDocumentsUrl).toBe(newUrl);
      expect(result.status).toBe(AdmissionStatusEnum.SUBMITTED);
      expect(result.remark).toContain('QCUT đã cập nhật');
    });
  });

  // =========================================================
  // 4. TEST: TRUY VẤN DỮ LIỆU (Read-only)
  // =========================================================
  describe('Read operations', () => {
    it('findAll: nên trả về danh sách hồ sơ sắp xếp theo thời gian', async () => {
      mockRepo.find.mockResolvedValue([mockAdmission]);
      
      const result = await service.findAll();
      
      expect(Array.isArray(result)).toBe(true);
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { updatedAt: 'DESC' } })
      );
    });

    it('findOne: nên ném lỗi nếu ID không tồn tại', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});