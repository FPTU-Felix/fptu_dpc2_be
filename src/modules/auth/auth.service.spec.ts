import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    password: 'hashedPassword',
    isActive: true,
    role: { name: 'admin' },
    hashedRefreshToken: 'hashedRT',
  };

  beforeEach(async () => {
    // Khởi tạo các mock methods
    usersService = {
      findOneByUsername: jest.fn(),
      findOneById: jest.fn(),
      updateRefreshToken: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- Test 1: ĐĂNG NHẬP (signin) ---
  describe('signin', () => {
    const signinDto = { username: 'testuser', password: 'password123' };

    it('nên trả về tokens khi thông tin đăng nhập đúng', async () => {
      (usersService.findOneByUsername as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('token-string');
      
      // Mock updateRefreshTokenHash bên trong signin
      jest.spyOn(service, 'updateRefreshTokenHash').mockImplementation(async () => {});

      const result = await service.signin(signinDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(usersService.findOneByUsername).toHaveBeenCalledWith(signinDto.username);
    });

    it('nên ném lỗi ForbiddenException nếu không tìm thấy user', async () => {
      (usersService.findOneByUsername as jest.Mock).mockResolvedValue(null);

      await expect(service.signin(signinDto)).rejects.toThrow(ForbiddenException);
    });

    it('nên ném lỗi ForbiddenException nếu sai mật khẩu', async () => {
      (usersService.findOneByUsername as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signin(signinDto)).rejects.toThrow('Sai tài khoản hoặc mật khẩu');
    });

    it('nên ném lỗi ForbiddenException nếu tài khoản bị khóa', async () => {
      (usersService.findOneByUsername as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.signin(signinDto)).rejects.toThrow('Tài khoản của bạn đã bị khóa');
    });
  });

  // --- Test 2: ĐĂNG XUẤT (logout) ---
  describe('logout', () => {
    it('nên gọi updateRefreshToken với giá trị null', async () => {
      const userId = 'user-123';
      const result = await service.logout(userId);

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(userId, null);
      expect(result).toEqual({ message: 'Đăng xuất thành công' });
    });
  });

  // --- Test 3: LẤY TOKEN MỚI (refreshTokens) ---
  describe('refreshTokens', () => {
    const userId = 'user-123';
    const rt = 'refresh-token';

    it('nên trả về tokens mới khi RT hợp lệ', async () => {
      (usersService.findOneById as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest.spyOn(service, 'generateTokens').mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
      jest.spyOn(service, 'updateRefreshTokenHash').mockImplementation(async () => {});

      const result = await service.refreshTokens(userId, rt);

      expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt' });
    });

    it('nên ném lỗi nếu user không tồn tại hoặc không có hashedRefreshToken', async () => {
      (usersService.findOneById as jest.Mock).mockResolvedValue(null);
      await expect(service.refreshTokens(userId, rt)).rejects.toThrow(ForbiddenException);
    });

    it('nên ném lỗi nếu RT không khớp', async () => {
      (usersService.findOneById as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens(userId, rt)).rejects.toThrow('Token không hợp lệ');
    });
  });

  // --- Test 4: UPDATE REFRESH TOKEN HASH ---
  describe('updateRefreshTokenHash', () => {
    it('nên hash token và lưu vào database', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-rt');
      
      await service.updateRefreshTokenHash('user-123', 'raw-rt');

      expect(bcrypt.hash).toHaveBeenCalledWith('raw-rt', 10);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', 'hashed-rt');
    });
  });
});