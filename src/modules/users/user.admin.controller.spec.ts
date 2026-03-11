import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersAdminController } from './user.admin.controller';
import { UsersService } from './users.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';


describe('UsersAdminController', () => {
  let controller: UsersAdminController;
  const serviceMock = {
    paginate: jest.fn(),
    createByAdmin: jest.fn(),
    resendWelcomeEmail: jest.fn(),
    banUser: jest.fn(),
    unbanUser: jest.fn(),
  } as jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersAdminController],
      providers: [
        { provide: UsersService, useValue: serviceMock },
      ],
    }).compile();

    controller = module.get<UsersAdminController>(UsersAdminController);
    jest.clearAllMocks();
  });

  it('TC01: findAll should call service.paginate with page, limit and options', async () => {
    serviceMock.paginate.mockResolvedValue({ items: [], meta: {} } as any);
    const res = await controller.findAll(2, 20);
    expect(serviceMock.paginate).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 20 }),
      expect.objectContaining({ order: { createdAt: 'DESC' }, relations: ['role'] }),
    );
    expect(res).toEqual({ items: [], meta: {} });
  });

  it('TC02: adminCreate should call service.createByAdmin with dto', async () => {
    const dto = { username: 'u', email: 'e', roleName: 'ADMIN' } as any;
    serviceMock.createByAdmin.mockResolvedValue({ success: true } as any);
    const res = await controller.adminCreate(dto);
    expect(serviceMock.createByAdmin).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ success: true });
  });

  it('TC03: resendEmail should call service.resendWelcomeEmail with body content', async () => {
    serviceMock.resendWelcomeEmail.mockResolvedValue({ message: 'ok' } as any);
    const res = await controller.resendEmail({ userId: 'u-1', tempPass: 't-1' });
    expect(serviceMock.resendWelcomeEmail).toHaveBeenCalledWith('u-1', 't-1');
    expect(res).toEqual({ message: 'ok' });
  });

  it('TC04: banUser should call service.banUser with id', async () => {
    serviceMock.banUser.mockResolvedValue({ success: true } as any);
    const res = await controller.banUser('u-2');
    expect(serviceMock.banUser).toHaveBeenCalledWith('u-2');
    expect(res).toEqual({ success: true });
  });

  it('TC05: unbanUser should call service.unbanUser with id', async () => {
    serviceMock.unbanUser.mockResolvedValue({ success: true } as any);
    const res = await controller.unbanUser('u-3');
    expect(serviceMock.unbanUser).toHaveBeenCalledWith('u-3');
    expect(res).toEqual({ success: true });
  });

  it('META: handlers should define roles metadata', () => {
    const proto = Object.getPrototypeOf(controller);
    expect(Reflect.getMetadata(ROLES_KEY, proto.findAll)).toBeDefined();
    expect(Reflect.getMetadata(ROLES_KEY, proto.adminCreate)).toBeDefined();
    expect(Reflect.getMetadata(ROLES_KEY, proto.resendEmail)).toBeDefined();
    expect(Reflect.getMetadata(ROLES_KEY, proto.banUser)).toBeDefined();
    expect(Reflect.getMetadata(ROLES_KEY, proto.unbanUser)).toBeDefined();
  });
});
