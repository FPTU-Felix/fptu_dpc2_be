import { Test, TestingModule } from '@nestjs/testing';
import { PartyMembersService } from './party-members.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PartyMember } from './entities/party-member.entity';
import { PartyMemberPosition } from 'src/modules/party-positions/entities/party-member-position.entity';
import { PartyPosition as PartyPositionEntity } from '../party-positions/entities/party-position.entity';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PartyPosition, UserRole, NotificationType } from '../../common/enums';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';

describe('PartyMembersService - Assign Position Logic', () => {
  let service: PartyMembersService;
  let memberPositionRepo: Repository<PartyMemberPosition>;

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
    id: 'pos-id-123',
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
            transaction: jest.fn((cb) => cb(mockManager)),
          },
        },
      ],
    }).compile();

    service = module.get<PartyMembersService>(PartyMembersService);
    memberPositionRepo = module.get(getRepositoryToken(PartyMemberPosition));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignPosition', () => {
    const adminId = 'admin-uuid';
    const memberId = 'member-1';
    const dto = { 
      positionCode: PartyPosition.SECRETARY, 
      note: 'Bổ nhiệm Bí thư',
      appointedDate: '2026-04-07'
    };

    // --- 1. ABNORMAL CASES (Trường hợp lỗi) ---

    it(' nên ném lỗi BadRequest nếu mã chức vụ không tồn tại', async () => {
      mockManager.findOne.mockResolvedValueOnce(null); // positionMeta null

      await expect(service.assignPosition(adminId, memberId, dto as any))
        .rejects.toThrow(BadRequestException);
    });

    it(' nên ném lỗi NotFound nếu không tìm thấy hồ sơ Đảng viên', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockPositionMeta) // Thấy chức vụ
        .mockResolvedValueOnce(null); // Không thấy Đảng viên

      await expect(service.assignPosition(adminId, memberId, dto as any))
        .rejects.toThrow(NotFoundException);
    });

    // --- 2. BOUNDARY & LOGIC CASES (Trường hợp ranh giới) ---

    it(' nên trả về tin nhắn nếu Đảng viên đã giữ đúng chức vụ này rồi', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockPositionMeta)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce({ positionId: mockPositionMeta.id, isCurrent: true }); 
      const result = await service.assignPosition(adminId, memberId, dto as any);
      expect(result.message).toBe('Đảng viên đang giữ chức vụ này rồi.');
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it(' nên in cảnh báo console.warn nếu Role tương ứng không tồn tại trong DB', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(mockPositionMeta)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(null) // Không có chức vụ cũ
        .mockResolvedValueOnce(null); // roleEntity null (Không tìm thấy role SECRETARY)

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await service.assignPosition(adminId, memberId, dto as any);
      
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Không tìm thấy Role'));
      expect(mockManager.update).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    // --- 3. NORMAL CASES (Trường hợp thành công) ---

    it(' nên đóng chức vụ cũ và bổ nhiệm chức vụ mới thành công', async () => {
      const oldPosition = { id: 'old-assignment', positionId: 'old-pos-id', isCurrent: true };
      
      mockManager.findOne
        .mockResolvedValueOnce(mockPositionMeta)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(oldPosition) // Có chức vụ hiện tại khác
        .mockResolvedValueOnce({ id: 'role-secretary-id', name: UserRole.SECRETARY });

      mockManager.create.mockReturnValue({ id: 'new-assign-id' });

      const result = await service.assignPosition(adminId, memberId, dto as any);

      // Kiểm tra logic đóng chức vụ cũ
      expect(oldPosition.isCurrent).toBe(false);
      expect(oldPosition).toHaveProperty('dismissedDate');
      expect(mockManager.save).toHaveBeenCalledWith(oldPosition);

      // Kiểm tra logic bổ nhiệm mới
      expect(result.message).toBe('Bổ nhiệm thành công');
      expect(result.roleAssigned).toBe(UserRole.SECRETARY);
      expect(mockManager.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        positionId: mockPositionMeta.id,
        isCurrent: true
      }));

      // Kiểm tra cập nhật quyền User
      expect(mockManager.update).toHaveBeenCalledWith(User, mockMember.userId, {
        roleId: 'role-secretary-id'
      });
    });

    it(' nên map đúng chức vụ ADMIN sang quyền ADMIN', async () => {
      const adminDto = { positionCode: PartyPosition.ADMIN };
      const adminPosMeta = { id: 'admin-pos-id', code: PartyPosition.ADMIN };

      mockManager.findOne
        .mockResolvedValueOnce(adminPosMeta)
        .mockResolvedValueOnce(mockMember)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'role-admin-id', name: UserRole.ADMIN });

      const result = await service.assignPosition(adminId, memberId, adminDto as any);

      expect(result.roleAssigned).toBe(UserRole.ADMIN);
      expect(mockManager.update).toHaveBeenCalledWith(User, mockMember.userId, {
        roleId: 'role-admin-id'
      });
    });
  });

  describe('getPositionHistory', () => {
    it(' nên trả về danh sách lịch sử sắp xếp giảm dần theo ngày', async () => {
      const mockHistory = [{ id: '1', appointedDate: new Date() }];
      (memberPositionRepo.find as jest.Mock).mockResolvedValue(mockHistory);

      const result = await service.getPositionHistory('member-1');

      expect(result).toEqual(mockHistory);
      expect(memberPositionRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { memberId: 'member-1' },
        order: { appointedDate: 'DESC' }
      }));
    });
  });
});