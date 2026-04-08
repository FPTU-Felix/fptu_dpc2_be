import { Test, TestingModule } from '@nestjs/testing';
import { PartyFeesService } from './party-fees.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PartyFee, FeeStatusEnum } from './entities/party-fee.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as nestjsTypeormPaginate from 'nestjs-typeorm-paginate';

// 1. Mock thư viện phân trang
jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('PartyFeesService', () => {
  let service: PartyFeesService;
  let feeRepo: Repository<PartyFee>;
  let notificationsService: NotificationsService;
  let mockQueryBuilder: any;

  const mockFeeId = 'fee-uuid';
  const mockAdminId = 'admin-uuid';

  const mockFeeRecord = {
    id: mockFeeId,
    month: 4,
    year: 2026,
    status: FeeStatusEnum.PENDING,
    member: {
      user: { id: 'user-1', email: 'test@gmail.com' }
    }
  };

  beforeEach(async () => {
    // 2. Mock QueryBuilder chain
    mockQueryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartyFeesService,
        {
          provide: getRepositoryToken(PartyFee),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createInternal: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<PartyFeesService>(PartyFeesService);
    feeRepo = module.get<Repository<PartyFee>>(getRepositoryToken(PartyFee));
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- UC01: TRUY VẤN DANH SÁCH ĐẢNG PHÍ ---
  describe('getFeesByChiBo', () => {
    const dto = { partyCellId: 'cell-1', month: 4, year: 2026 };
    const options = { page: 1, limit: 10 };

    it(' nên trả về danh sách phân trang thành công', async () => {
      const mockPaginatedResult = { items: [mockFeeRecord], meta: {} };
      (nestjsTypeormPaginate.paginate as jest.Mock).mockResolvedValue(mockPaginatedResult);

      const result = await service.getFeesByChiBo(dto, options);

      expect(result).toEqual(mockPaginatedResult);
      expect(feeRepo.createQueryBuilder).toHaveBeenCalledWith('fee');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(expect.any(String), { partyCellId: 'cell-1' });
    });

    it(' nên ném lỗi BadRequest nếu query builder gặp sự cố', async () => {
      mockQueryBuilder.innerJoinAndSelect.mockImplementation(() => {
        throw new Error('Database Error');
      });

      await expect(service.getFeesByChiBo(dto, options)).rejects.toThrow(BadRequestException);
    });
  });

  // --- UC02: XÁC NHẬN THANH TOÁN (CONFIRM PAYMENT) ---
  describe('confirmPayment', () => {
    it(' nên cập nhật trạng thái PAID và gửi thông báo cho Đảng viên', async () => {
      // Mock tìm thấy bản ghi đang PENDING
      (feeRepo.findOne as jest.Mock).mockResolvedValue({ ...mockFeeRecord });
      (feeRepo.save as jest.Mock).mockImplementation((val) => Promise.resolve({ ...val, paymentDate: new Date() }));

      const result = await service.confirmPayment(mockFeeId, mockAdminId);

      expect(result.success).toBe(true);
      expect(feeRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        status: FeeStatusEnum.PAID,
        recordedById: mockAdminId,
      }));
      expect(notificationsService.createInternal).toHaveBeenCalled();
    });

    it(' nên ném lỗi NotFoundException nếu ID phí không tồn tại', async () => {
      (feeRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.confirmPayment('wrong-id', mockAdminId))
        .rejects.toThrow(NotFoundException);
    });

    it(' nên ném lỗi BadRequest nếu Đảng phí đã được đóng từ trước (PAID)', async () => {
      (feeRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockFeeRecord,
        status: FeeStatusEnum.PAID,
      });

      await expect(service.confirmPayment(mockFeeId, mockAdminId))
        .rejects.toThrow(BadRequestException);
    });

    it(' vẫn thành công nhưng không gửi thông báo nếu Đảng viên không có User liên kết', async () => {
      // Giả lập bản ghi không có thông tin user
      (feeRepo.findOne as jest.Mock).mockResolvedValue({
        ...mockFeeRecord,
        member: { user: null } 
      });
      (feeRepo.save as jest.Mock).mockImplementation((val) => Promise.resolve({ ...val, paymentDate: new Date() }));

      const result = await service.confirmPayment(mockFeeId, mockAdminId);

      expect(result.success).toBe(true);
      expect(notificationsService.createInternal).not.toHaveBeenCalled();
    });
  });
});