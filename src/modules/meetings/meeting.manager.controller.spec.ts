import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MeetingsManagerController } from './meeting.manager.controller';
import { MeetingsService } from './meetings.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

// Minimal DTO shapes for type-only references
class CreateMeetingDto { }
class UpdateMeetingDto { }
class ReviewLeaveRequestDto { }

describe('MeetingsManagerController', () => {
  let controller: MeetingsManagerController;
  const serviceMock = {
    create: jest.fn(),
    getCurrentPin: jest.fn(),
    toggleCheckIn: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getAttendees: jest.fn(),
    reviewLeaveRequest: jest.fn(),
    endMeeting: jest.fn(),
  } as jest.Mocked<MeetingsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingsManagerController],
      providers: [
        { provide: MeetingsService, useValue: serviceMock },
        // Some tests import DataSource globally; provide a noop to avoid DI issues
        { provide: DataSource, useValue: {} },
        // Some test runners may attempt repository tokens; ignore if unused here
        { provide: getRepositoryToken as any, useValue: {} },
      ],
    }).compile();

    controller = module.get<MeetingsManagerController>(MeetingsManagerController);
    jest.clearAllMocks();
  });

  it('TC01: create should forward userId and dto to service', async () => {
    const userId = 'user-1';
    const dto = {} as CreateMeetingDto;
    serviceMock.create.mockResolvedValue({ ok: true });
    const res = await controller.create(userId, dto);
    expect(serviceMock.create).toHaveBeenCalledWith(userId, dto);
    expect(res).toEqual({ ok: true });
  });

  it('TC02: getPin should call service.getCurrentPin with id', async () => {
    serviceMock.getCurrentPin.mockResolvedValue({ pin: '123456' });
    const res = await controller.getPin('m-1');
    expect(serviceMock.getCurrentPin).toHaveBeenCalledWith('m-1');
    expect(res).toEqual({ pin: '123456' });
  });

  it('TC03: toggleCheckIn should call service.toggleCheckIn with id', async () => {
    serviceMock.toggleCheckIn.mockResolvedValue({ toggled: true });
    const res = await controller.toggleCheckIn('m-2');
    expect(serviceMock.toggleCheckIn).toHaveBeenCalledWith('m-2');
    expect(res).toEqual({ toggled: true });
  });

  it('TC04: update should call service.update with id and dto', async () => {
    const dto = {} as UpdateMeetingDto;
    serviceMock.update.mockResolvedValue({ updated: true });
    const res = await controller.update('m-3', dto);
    expect(serviceMock.update).toHaveBeenCalledWith('m-3', dto);
    expect(res).toEqual({ updated: true });
  });

  it('TC05: endMeeting should call service.endMeeting with id', async () => {
    serviceMock.endMeeting.mockResolvedValue({ ended: true });
    const res = await controller.endMeeting('m-4');
    expect(serviceMock.endMeeting).toHaveBeenCalledWith('m-4');
    expect(res).toEqual({ ended: true });
  });

  it('META: should have roles metadata for protected handlers', () => {
    const proto = Object.getPrototypeOf(controller);
    const rolesCreate = Reflect.getMetadata(ROLES_KEY, proto.create);
    const rolesGetPin = Reflect.getMetadata(ROLES_KEY, proto.getPin);
    const rolesToggle = Reflect.getMetadata(ROLES_KEY, proto.toggleCheckIn);
    const rolesUpdate = Reflect.getMetadata(ROLES_KEY, proto.update);
    const rolesRemove = Reflect.getMetadata(ROLES_KEY, proto.remove);
    const rolesAttendees = Reflect.getMetadata(ROLES_KEY, proto.getAttendees);
    const rolesEnd = Reflect.getMetadata(ROLES_KEY, proto.endMeeting);

    expect(rolesCreate).toBeDefined();
    expect(rolesGetPin).toBeDefined();
    expect(rolesToggle).toBeDefined();
    expect(rolesUpdate).toBeDefined();
    expect(rolesRemove).toBeDefined();
    expect(rolesAttendees).toBeDefined();
    expect(rolesEnd).toBeDefined();
  });
});
