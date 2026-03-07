import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { MailService } from '../mail/mail.service';
import { DataSource, Repository, MoreThan } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { GenderEnum, UserRole } from 'src/common/enums';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';

// Mock hàm paginate của thư viện ngoài
jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn().mockResolvedValue({ items: [], meta: {} }),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: Repository<User>;
  let roleRepo: Repository<Role>;
  let mailService: MailService;
  let dataSource: DataSource;

  const mockUser = {
    id: 'u-1', username: 'dev', email: 'dev@fpt.edu.vn', isActive: true,
    role: { name: 'USER' }, isFirstLogin: true, lastForgotPasswordAt: null
  } as any;

  // Mock cho Transaction
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
        { provide: getRepositoryToken(User), useValue: { 
          findOne: jest.fn(), find: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn(),
          createQueryBuilder: jest.fn(() => ({
            innerJoin: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
          })),
        }},
        { provide: getRepositoryToken(Role), useValue: { findOne: jest.fn() }},
        { provide: MailService, useValue: { sendMail: jest.fn() }},
        { provide: DataSource, useValue: { 
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
            getRepository: jest.fn().mockReturnValue({ findOne: jest.fn(), save: jest.fn() }) 
        }},
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
    mailService = module.get(MailService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => jest.clearAllMocks());

  // --- 1. FIND & BASIC METHODS ---
  describe('Basic Find & Update', () => {
    it('findAll() nên trả về mảng user với select cụ thể', async () => {
      await service.findAll();
      expect(userRepo.find).toHaveBeenCalledWith(expect.objectContaining({ relations: ['role'] }));
    });

    it('updateRefreshToken() nên gọi repository.update', async () => {
      await service.updateRefreshToken('u-1', 'token');
      expect(userRepo.update).toHaveBeenCalledWith('u-1', { hashedRefreshToken: 'token' });
    });
  });

  // --- 2. CREATE BY ADMIN (Hàm rất nhiều logic) ---
  describe('createByAdmin', () => {
    const adminDto: AdminCreateUserDto = { username: 'test', email: 'test@fpt.vn', roleName: UserRole.ADMIN };

    it('nên báo lỗi nếu Role chưa được cấu hình', async () => {
      (roleRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.createByAdmin(adminDto)).rejects.toThrow(BadRequestException);
    });

    it('nên báo lỗi nếu chỉ có 1 ADMIN trong hệ thống', async () => {
      (roleRepo.findOne as jest.Mock).mockResolvedValue({ id: 'r-1', name: 'ADMIN' });
      (userRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // existing check
        .mockResolvedValueOnce({ id: 'u-admin' }); // existingRoleUser check
      await expect(service.createByAdmin(adminDto)).rejects.toThrow('Chỉ được phép có 1 ADMIN');
    });

    it('nên bắt lỗi catch khi gửi mail thất bại và trả về thông tin mật khẩu thủ công', async () => {
      (roleRepo.findOne as jest.Mock).mockResolvedValue({ id: 'r-2', name: 'USER' });
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);
      (userRepo.save as jest.Mock).mockResolvedValue({ id: 'u-new' });
      (mailService.sendMail as jest.Mock).mockRejectedValue(new Error('SMTP Error'));

      const result = await service.createByAdmin({...adminDto, roleName: UserRole.ADMIN});
      expect(result.success).toBe(false);
      expect(result).toHaveProperty('instruction');
    });
  });

  // --- 3. COMPLETE PROFILE (Hàm xử lý Transaction) ---
  describe('completeProfile', () => {
    const completeDto = { 
        fullName: 'Test', newPassword: 'Password123', confirmPassword: 'Password123', 
        gender: GenderEnum.MALE, dateOfBirth: new Date(), hometown: 'HN', phone: '09' 
    } as any;

    it('nên rollback nếu user đã hoàn thiện hồ sơ trước đó', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue({ ...mockUser, isFirstLogin: false });
      await expect(service.completeProfile('u-1', completeDto)).rejects.toThrow('Hồ sơ đã được hoàn thiện');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('nên báo lỗi nếu mật khẩu không đúng định dạng (Check validatePassword)', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockUser);
      await expect(service.completeProfile('u-1', { ...completeDto, newPassword: '123' }))
        .rejects.toThrow('Mật khẩu phải có ít nhất 6 ký tự');
    });
  });

  // --- 4. FORGOT & RESET PASSWORD ---
  describe('Password Recovery', () => {
    it('forgotPassword: nên báo lỗi nếu yêu cầu < 60 giây', async () => {
      const recentlyUser = { ...mockUser, lastForgotPasswordAt: new Date() };
      (userRepo.findOne as jest.Mock).mockResolvedValue(recentlyUser);
      await expect(service.forgotPassword({ email: 'test@fpt.vn' })).rejects.toThrow('Vui lòng đợi');
    });

    it('resetPassword: nên báo lỗi nếu mã token hết hạn', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.resetPassword({ token: 'invalid', newPassword: 'Pass123' }))
        .rejects.toThrow('Mã xác nhận không hợp lệ hoặc đã hết hạn');
    });
  });

  // --- 5. BAN & UNBAN USER ---
  describe('Ban/Unban', () => {
    it('banUser: nên ném lỗi nếu cố tình khóa tài khoản ADMIN', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockUser, role: { name: 'ADMIN' } });
      await expect(service.banUser('u-1')).rejects.toThrow('Không thể khóa tài khoản Quản trị viên');
    });

    it('unbanUser: báo lỗi nếu tài khoản đang hoạt động bình thường', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ ...mockUser, isActive: true });
      await expect(service.unbanUser('u-1')).rejects.toThrow('hiện vẫn đang hoạt động');
    });
  });

  // --- 6. PAGINATION ---
  describe('paginateMembersByCell', () => {
    it('nên báo lỗi nếu người yêu cầu (requester) không có hồ sơ đảng viên', async () => {
        (dataSource.getRepository(PartyMember).findOne as jest.Mock).mockResolvedValue(null);
        await expect(service.paginateMembersByCell('u-1', { page: 1, limit: 10 }))
            .rejects.toThrow(ForbiddenException);
    });
  });
});