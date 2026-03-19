import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    password: 'hashedPassword',
    isActive: true,
    role: { name: 'ADMIN' },
    hashedRefreshToken: 'hashedRT',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOneByEmailOrUsername: jest.fn(),
            findOneById: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('signin', () => {
    const signinDto = { username: 'testuser', password: 'password123' };

    it('nên trả về tokens khi thông tin đăng nhập đúng', async () => {
      usersService.findOneByEmailOrUsername.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('token-string');
      jest.spyOn(service, 'updateRefreshTokenHash').mockResolvedValue(undefined);

      const result = await service.signin(signinDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(usersService.findOneByEmailOrUsername).toHaveBeenCalledWith(signinDto.username);
    });

    it('nên ném lỗi nếu không tìm thấy user', async () => {
      usersService.findOneByEmailOrUsername.mockResolvedValue(null);

      await expect(service.signin(signinDto)).rejects.toThrow('Sai tài khoản hoặc mật khẩu');
    });

    it('nên ném lỗi nếu sai mật khẩu', async () => {
      usersService.findOneByEmailOrUsername.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signin(signinDto)).rejects.toThrow('Sai tài khoản hoặc mật khẩu');
    });

    it('nên ném lỗi nếu tài khoản bị khóa', async () => {
      usersService.findOneByEmailOrUsername.mockResolvedValue({ ...mockUser, isActive: false } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.signin(signinDto)).rejects.toThrow('Tài khoản của bạn đã bị khóa');
    });
    it('nên đăng nhập thành công khi mật khẩu có độ dài đúng bằng biên tối thiểu (6 ký tự)', async () => {
      const boundaryDto = { username: 'testuser', password: 'p12345' }; // Đúng 6 ký tự
      
      usersService.findOneByEmailOrUsername.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('token-string');
      jest.spyOn(service, 'updateRefreshTokenHash').mockResolvedValue(undefined);

      const result = await service.signin(boundaryDto);

      expect(result).toHaveProperty('accessToken');
      expect(bcrypt.compare).toHaveBeenCalledWith(boundaryDto.password, mockUser.password);
    });
  });

  describe('logout', () => {
    it('nên gọi updateRefreshToken với giá trị null', async () => {
      const userId = 'user-123';
      const result = await service.logout(userId);

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(userId, null);
      expect(result).toEqual({ message: 'Đăng xuất thành công' });
    });
  });

  describe('refreshTokens', () => {
    const userId = 'user-123';
    const rt = 'refresh-token-string';

    it('nên trả về tokens mới khi RT hợp lệ', async () => {
      usersService.findOneById.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(service, 'generateTokens').mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
      jest.spyOn(service, 'updateRefreshTokenHash').mockResolvedValue(undefined);

      const result = await service.refreshTokens(userId, rt);

      expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt' });
    });

    it('nên chặn truy cập nếu user không có hashedRefreshToken trong DB', async () => {
      usersService.findOneById.mockResolvedValue({ ...mockUser, hashedRefreshToken: null } as any);
      await expect(service.refreshTokens(userId, rt)).rejects.toThrow('Từ chối truy cập');
    });

    it('nên ném lỗi nếu RT không khớp với hash', async () => {
      usersService.findOneById.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens(userId, rt)).rejects.toThrow('Token không hợp lệ');
    });
  });

  describe('updateRefreshTokenHash', () => {
    it('nên xóa token trong DB nếu rt là null', async () => {
      await service.updateRefreshTokenHash('user-123', null);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', null);
    });

    it('nên hash token và lưu vào database nếu rt hợp lệ', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-rt');
      await service.updateRefreshTokenHash('user-123', 'raw-rt');

      expect(bcrypt.hash).toHaveBeenCalledWith('raw-rt', 10);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', 'hashed-rt');
    });
  });
});