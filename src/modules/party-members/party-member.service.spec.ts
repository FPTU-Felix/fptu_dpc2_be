import { Test, TestingModule } from '@nestjs/testing';
import { PartyMembersService } from './party-members.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PartyMember } from './entities/party-member.entity';
import { PartyMemberPosition } from 'src/modules/party-positions/entities/party-member-position.entity';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PartyPosition, UserRole } from '../../common/enums';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';

describe('PartyMembersService', () => {
  let service: PartyMembersService;
  let memberPositionRepo: Repository<PartyMemberPosition>;
  let dataSource: DataSource;

  // Mock Manager cho Transaction
  const mockManager = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockMember = {
    id: 'member-1',
    userId: 'user-1',
    partyCellId: 'cell-1',
  };

  const mockPositionMeta = {
    id: 'pos-1',
    code: PartyPosition.SECRETARY,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartyMembersService,
        {
          provide: getRepositoryToken(PartyMember),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(PartyMemberPosition),
          useValue: { find: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            // Giả lập transaction: thực thi callback với mockManager
            transaction: jest.fn((cb) => cb(mockManager)),
          },
        },
      ],
    }).compile();

    service = module.get<PartyMembersService>(PartyMembersService);
    memberPositionRepo = module.get(getRepositoryToken(PartyMemberPosition));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignPosition', () => {
    const adminId = 'admin-id';
    const memberId = 'member-1';
    const dto = { positionCode: PartyPosition.SECRETARY, note: 'Test' };

    it('nên ném lỗi BadRequestException nếu mã chức vụ không tồn tại (TC01)', async () => {
      mockManager.findOne.mockResolvedValueOnce(null); // positionMeta not found

      await expect(service.assignPosition(adminId, memberId, dto as any))
        .rejects.toThrow(BadRequestException);
    });

    it('nên ném lỗi NotFoundException nếu không tìm thấy Đảng viên (TC02)', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockPositionMeta) // Tìm thấy chức vụ
        .mockResolvedValueOnce(null); // Không thấy member

      await expect(service.assignPosition(adminId, memberId, dto as any))
        .rejects.toThrow(NotFoundException);
    });

    it('nên báo tin nhắn nếu Đảng viên đang giữ chức vụ này rồi (TC03)', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockPositionMeta)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce({ positionId: 'pos-1', isCurrent: true }); // Chức vụ hiện tại trùng khớp

      const result = await service.assignPosition(adminId, memberId, dto as any);
      expect(result.message).toBe('Đảng viên đang giữ chức vụ này rồi.');
    });

    it('nên bổ nhiệm thành công và cập nhật quyền User (TC04, TC07)', async () => {
      // 1. Setup mocks
      mockManager.findOne
        .mockResolvedValueOnce(mockPositionMeta) // positionMeta
        .mockResolvedValueOnce(mockMember) // member
        .mockResolvedValueOnce(null) // không có currentPosition
        .mockResolvedValueOnce({ id: 'role-secretary', name: UserRole.SECRETARY }); // roleEntity

      mockManager.create.mockReturnValue({ id: 'new-assign-id' });

      // 2. Execute
      const result = await service.assignPosition(adminId, memberId, dto as any);

      // 3. Verify
      expect(result.message).toBe('Bổ nhiệm thành công');
      expect(result.roleAssigned).toBe(UserRole.SECRETARY);
      expect(mockManager.save).toHaveBeenCalled();
      expect(mockManager.update).toHaveBeenCalledWith(User, 'user-1', {
        role: expect.objectContaining({ name: UserRole.SECRETARY }),
      });
    });

    it('nên đóng chức vụ cũ trước khi mở chức vụ mới', async () => {
      const oldPosition = { id: 'old-id', positionId: 'old-pos', isCurrent: true };
      
      mockManager.findOne
        .mockResolvedValueOnce(mockPositionMeta)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(oldPosition); // Trả về chức vụ hiện tại khác chức vụ mới

      await service.assignPosition(adminId, memberId, dto as any);

      // Kiểm tra chức vụ cũ bị đóng
      expect(oldPosition.isCurrent).toBe(false);
      expect(oldPosition).toHaveProperty('dismissedDate');
      expect(mockManager.save).toHaveBeenCalledWith(oldPosition);
    });
  });

  describe('getPositionHistory', () => {
    it('nên trả về lịch sử chức vụ sắp xếp theo ngày bổ nhiệm (TC01)', async () => {
      const mockHistory = [{ id: '1' }, { id: '2' }];
      (memberPositionRepo.find as jest.Mock).mockResolvedValue(mockHistory);

      const result = await service.getPositionHistory('member-1');

      expect(result).toEqual(mockHistory);
      expect(memberPositionRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        order: { appointedDate: 'DESC' }
      }));
    });
  });
});