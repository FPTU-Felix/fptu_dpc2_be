import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signin: jest.fn(),
            logout: jest.fn(),
            refreshTokens: jest.fn(),
          },
        },
        {
          provide: UsersService, // Cần cung cấp vì có trong constructor Controller
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signin', () => {
    it('nên gọi AuthService.signin và trả về tokens', async () => {
      const dto: any = { username: 'admin', password: 'P@ssw0rd123' };
      const result = { accessToken: 'at', refreshToken: 'rt' };
      authService.signin.mockResolvedValue(result);

      const response = await controller.signin(dto);

      expect(response).toEqual(result);
      expect(authService.signin).toHaveBeenCalledWith(dto);
    });

    it('nên ném lại lỗi nếu AuthService.signin thất bại', async () => {
      const dto: any = { username: 'wrong', password: 'bad' };
      const error = new ForbiddenException('Sai tài khoản hoặc mật khẩu');
      authService.signin.mockRejectedValue(error);

      await expect(controller.signin(dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('nên gọi AuthService.logout với userId lấy từ GetCurrentUser', async () => {
      const userId = 'user-123';
      const result = { message: 'Đăng xuất thành công' };
      authService.logout.mockResolvedValue(result);

      const response = await controller.logout(userId);

      expect(response).toEqual(result);
      expect(authService.logout).toHaveBeenCalledWith(userId);
    });
  });

  describe('refreshTokens', () => {
    it('nên gọi AuthService.refreshTokens với userId và refreshToken', async () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token-string';
      const result = { accessToken: 'new-at', refreshToken: 'new-rt' };
      authService.refreshTokens.mockResolvedValue(result);

      const response = await controller.refreshTokens(userId, refreshToken);

      expect(response).toEqual(result);
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        userId,
        refreshToken,
      );
    });
  });
});
