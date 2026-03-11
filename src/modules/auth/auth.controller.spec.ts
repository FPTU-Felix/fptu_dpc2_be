import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;

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
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    usersService = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signin', () => {
    it('should delegate to AuthService.signin and return tokens', async () => {
      const dto: any = { username: 'Nguyen Van A', password: 'P@ssw0rd123' };
      const result = { accessToken: 'at', refreshToken: 'rt' };
      (authService.signin as jest.Mock).mockResolvedValue(result);

      await expect(controller.signin(dto)).resolves.toEqual(result);
      expect(authService.signin).toHaveBeenCalledWith(dto);
    });

    it('should propagate exceptions thrown by AuthService.signin', async () => {
      const dto: any = { username: 'wrong', password: 'bad' };
      const error = new ForbiddenException('Invalid credentials');
      (authService.signin as jest.Mock).mockRejectedValue(error);

      await expect(controller.signin(dto)).rejects.toBe(error);
    });
  });

  describe('logout', () => {
    it('should call AuthService.logout with userId and return result', async () => {
      const userId = 'user-123';
      const result = { success: true } as any;
      (authService.logout as jest.Mock).mockResolvedValue(result);

      await expect(controller.logout(userId)).resolves.toEqual(result);
      expect(authService.logout).toHaveBeenCalledWith(userId);
    });
  });

  describe('refreshTokens', () => {
    it('should call AuthService.refreshTokens with correct args and return result', async () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token';
      const result = { accessToken: 'new-at', refreshToken: 'new-rt' };
      (authService.refreshTokens as jest.Mock).mockResolvedValue(result);

      await expect(controller.refreshTokens(userId, refreshToken)).resolves.toEqual(result);
      expect(authService.refreshTokens).toHaveBeenCalledWith(userId, refreshToken);
    });
  });

  describe('findAll', () => {
    it('should call UsersService.findAll and return users', async () => {
      const users = [{ id: '1', username: 'u1' }];
      (usersService.findAll as jest.Mock).mockResolvedValue(users);

      await expect(controller.findAll()).resolves.toBe(users);
      expect(usersService.findAll).toHaveBeenCalled();
    });

    it('should propagate exceptions from UsersService.findAll', async () => {
      const error = new Error('DB error');
      (usersService.findAll as jest.Mock).mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toBe(error);
    });
  });
});
