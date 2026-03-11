import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

// DTO references
class CompleteProfileDto { }
class ForgotPasswordDto { }
class ResetPasswordDto { }
class UpdateProfileDto { }

describe('UsersController', () => {
  let controller: UsersController;
  const serviceMock = {
    completeProfile: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    updateProfile: jest.fn(),
  } as jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: serviceMock },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('TC01: completeProfile should call service.completeProfile with userId and dto', async () => {
    const userId = 'user-1';
    const dto = {} as CompleteProfileDto;
    serviceMock.completeProfile.mockResolvedValue({ ok: true } as any);
    const res = await controller.completeProfile(userId, dto);
    expect(serviceMock.completeProfile).toHaveBeenCalledWith(userId, dto);
    expect(res).toEqual({ ok: true });
  });

  it('TC02: forgotPassword should call service.forgotPassword with dto', async () => {
    const dto = { email: 'a@b.com' } as ForgotPasswordDto;
    serviceMock.forgotPassword.mockResolvedValue({ message: 'sent' } as any);
    const res = await controller.forgotPassword(dto);
    expect(serviceMock.forgotPassword).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ message: 'sent' });
  });

  it('TC03: resetPassword should call service.resetPassword with dto', async () => {
    const dto = { token: 't', newPassword: 'P@ssw0rd' } as ResetPasswordDto;
    serviceMock.resetPassword.mockResolvedValue({ message: 'ok' } as any);
    const res = await controller.resetPassword(dto);
    expect(serviceMock.resetPassword).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ message: 'ok' });
  });

  it('TC04: updateMyProfile should call service.updateProfile with userId and dto', async () => {
    const userId = 'user-2';
    const dto = { fullName: 'A' } as UpdateProfileDto;
    serviceMock.updateProfile.mockResolvedValue({ id: 'pm-1' } as any);
    const res = await controller.updateMyProfile(userId, dto);
    expect(serviceMock.updateProfile).toHaveBeenCalledWith(userId, dto);
    expect(res).toEqual({ id: 'pm-1' });
  });

  it('META: should keep handlers defined', () => {
    const proto = Object.getPrototypeOf(controller);
    expect(typeof proto.completeProfile).toBe('function');
    expect(typeof proto.forgotPassword).toBe('function');
    expect(typeof proto.resetPassword).toBe('function');
    expect(typeof proto.updateMyProfile).toBe('function');
  });
});
