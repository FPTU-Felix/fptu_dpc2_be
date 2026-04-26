import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { PartyCell } from '../party-cells/entities/party-cell.entity';
import { MailService } from '../mail/mail.service';
import { AdmissionApplicationService } from '../party-admissions/services/admission-application.service';
import { DataSource, Repository, MoreThan } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Mock thư viện paginate
jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn().mockResolvedValue({ items: [], meta: {} }),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;
  let mailService: MailService;
  let admissionService: AdmissionApplicationService;
  let dataSource: DataSource;

  // --- MOCK DATA ---
  const createMockUser = () =>
    ({
      id: 'user-uuid',
      username: '20206125',
      email: 'anhvv@fpt.edu.vn',
      password: 'hashedPassword',
      isActive: true,
      isFirstLogin: true,
      role: { id: 'role-1', name: 'USER' },
      lastForgotPasswordAt: null,
    }) as any;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              innerJoin: jest.fn().mockReturnThis(),
              leftJoin: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
            })),
          },
        },
        { provide: getRepositoryToken(Role), useValue: { findOne: jest.fn() } },
        { provide: MailService, useValue: { sendMail: jest.fn() } },
        {
          provide: AdmissionApplicationService,
          useValue: { initAdmissionForQCUT: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn(),
              save: jest.fn(),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
    mailService = module.get(MailService);
    admissionService = module.get(AdmissionApplicationService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => jest.clearAllMocks());

  // --- 1. BASIC RETRIEVAL & UPDATES ---
  describe('Basic Methods', () => {
    it('findOneByUsername: nên tìm thấy user kèm role', async () => {
      const mockUser = createMockUser();
      (userRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      const res = await service.findOneByUsername('20206125');
      expect(res).toEqual(mockUser);
      expect(userRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['role'] }),
      );
    });

    it('updateRefreshToken: nên cập nhật token vào DB', async () => {
      await service.updateRefreshToken('id', 'token');
      expect(userRepo.update).toHaveBeenCalledWith('id', {
        hashedRefreshToken: 'token',
      });
    });
  });

  // --- 2. ADMIN CREATE USER (Complex Logic) ---
  describe('createByAdmin', () => {
    const dto = {
      username: 'anhvv',
      email: 'anh@fpt.vn',
      roleName: 'OUTSTANDING_INDIVIDUAL',
    };

    it('Normal: Tạo user thành công và gửi mail', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null); // Không trùng
      (roleRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'r1',
        name: 'OUTSTANDING_INDIVIDUAL',
      });
      (userRepo.save as jest.Mock).mockResolvedValue({ id: 'new-id' });

      const res = await service.createByAdmin(dto);

      expect(res.success).toBe(true);
      expect(admissionService.initAdmissionForQCUT).toHaveBeenCalled();
      expect(mailService.sendMail).toHaveBeenCalled();
    });

    it('Abnormal: Role không tồn tại', async () => {
      (roleRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.createByAdmin(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Boundary: Đã có 1 ADMIN trong hệ thống', async () => {
      (roleRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'ra',
        name: 'ADMIN',
      });
      (userRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // Check existing email
        .mockResolvedValueOnce({ id: 'other-admin' }); // Check existingRoleUser

      await expect(
        service.createByAdmin({ ...dto, roleName: 'ADMIN' }),
      ).rejects.toThrow('Chỉ được phép có 1 ADMIN');
    });

    it('Abnormal: Tạo thành công nhưng lỗi gửi mail', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);
      (roleRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'r1',
        name: 'USER',
      });
      (userRepo.save as jest.Mock).mockResolvedValue({ id: 'id' });
      (mailService.sendMail as jest.Mock).mockRejectedValue(
        new Error('SMTP Error'),
      );

      const res = await service.createByAdmin(dto);
      expect(res.success).toBe(false);
      expect(res.instruction).toBeDefined();
    });
  });

  // --- 3. COMPLETE PROFILE (Transaction) ---
  describe('completeProfile', () => {
    const dto = {
      fullName: 'Vu Viet Anh',
      newPassword: 'Password123',
      confirmPassword: 'Password123',
      partyCellId: 'cell-id',
      gender: 'MALE',
    } as any;

    it('Normal: Hoàn thiện hồ sơ thành công', async () => {
      const user = createMockUser();
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(user) // User check
        .mockResolvedValueOnce(null) // Existing member check
        .mockResolvedValueOnce({ id: 'cell-id' }); // Cell check

      const res = await service.completeProfile('user-uuid', dto);
      expect(res.status).toBe('COMPLETED');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('Abnormal: Mật khẩu xác nhận không khớp', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(createMockUser());
      await expect(
        service.completeProfile('user-uuid', {
          ...dto,
          confirmPassword: 'wrong',
        }),
      ).rejects.toThrow('Mật khẩu xác nhận không khớp');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('Boundary: Mật khẩu không đủ mạnh', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(createMockUser());
      await expect(
        service.completeProfile('user-uuid', { ...dto, newPassword: '123' }),
      ).rejects.toThrow('Mật khẩu phải có ít nhất 6 ký tự');
    });

    it('Abnormal: Chi bộ không tồn tại', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(createMockUser())
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null); // Cell check return null

      await expect(service.completeProfile('user-uuid', dto)).rejects.toThrow(
        'Chi bộ không tồn tại',
      );
    });
  });

  // --- 4. PASSWORD RECOVERY ---
  describe('ForgotPassword & Reset', () => {
    it('Boundary: Throttle 60s cho yêu cầu mã mới', async () => {
      const userWithTime = {
        ...createMockUser(),
        lastForgotPasswordAt: new Date(Date.now() - 30 * 1000), // Mới gửi 30s trước
      };
      (userRepo.findOne as jest.Mock).mockResolvedValue(userWithTime);

      await expect(
        service.forgotPassword({ email: 'anhvv@fpt.edu.vn' }),
      ).rejects.toThrow('Vui lòng đợi');
    });

    it('Normal: resetPassword thành công', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(createMockUser());
      const res = await service.resetPassword({
        token: 'valid-token',
        newPassword: 'NewPassword123',
      });
      expect(res.message).toBe('Đổi mật khẩu thành công!');
      expect(userRepo.save).toHaveBeenCalled();
    });
  });

  // --- 5. BAN / UNBAN ---
  describe('Ban/Unban', () => {
    it('Abnormal: Không được ban ADMIN', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({
        ...createMockUser(),
        role: { name: 'ADMIN' },
      });
      await expect(service.banUser('id')).rejects.toThrow(
        'Không thể khóa tài khoản Quản trị viên',
      );
    });

    it('Normal: Ban user thành công', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({
        ...createMockUser(),
        isActive: true,
      });
      const res = await service.banUser('id');
      expect(res.success).toBe(true);
    });
  });

  // --- 6. GET PROFILE (Mapping logic) ---
  describe('getProfile', () => {
    it('Normal: Trả về profile kèm position hiện tại', async () => {
      const mockMember = {
        userId: 'u1',
        fullName: 'Vu Viet Anh',
        user: { username: '20206125', role: { name: 'USER' } },
        positions: [
          { positionId: 'old-pos', isCurrent: false },
          { positionId: 'current-pos', isCurrent: true },
        ],
        partyCell: { id: 'c1', name: 'Chi bộ CNTT' },
      };
      (
        dataSource.getRepository(PartyMember).findOne as jest.Mock
      ).mockResolvedValue(mockMember);

      const res = await service.getProfile('u1');
      expect(res.position).toBe('current-pos');
      expect(res.roleCode).toBe('USER');
    });

    it('Abnormal: Không tìm thấy hồ sơ', async () => {
      (
        dataSource.getRepository(PartyMember).findOne as jest.Mock
      ).mockResolvedValue(null);
      await expect(service.getProfile('u1')).rejects.toThrow(NotFoundException);
    });
  });

  // --- 7. PAGINATION ---
  describe('paginateMembersByCell', () => {
    it('Abnormal: Người yêu cầu không có trong chi bộ nào', async () => {
      (
        dataSource.getRepository(PartyMember).findOne as jest.Mock
      ).mockResolvedValue(null);
      await expect(
        service.paginateMembersByCell('u1', { page: 1, limit: 10 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
