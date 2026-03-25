import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsManagerController } from './meeting.manager.controller';
import { MeetingsService } from './meetings.service';
import { UserRole } from 'src/common/enums';

describe('MeetingsManagerController', () => {
  let controller: MeetingsManagerController;
  let service: jest.Mocked<MeetingsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingsManagerController],
      providers: [
        {
          provide: MeetingsService,
          useValue: {
            create: jest.fn(),
            getCurrentPin: jest.fn(),
            toggleCheckIn: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getAttendees: jest.fn(),
            reviewLeaveRequest: jest.fn(),
            endMeeting: jest.fn(),
            updateManualAttendance: jest.fn(),
            updateMeetingMinutes: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MeetingsManagerController>(MeetingsManagerController);
    service = module.get(MeetingsService);
  });

  it('TC01: create nên gọi service.create', async () => {
    await controller.create('u-1', { title: 'Test' } as any);
    expect(service.create).toHaveBeenCalledWith('u-1', { title: 'Test' });
  });

  it('TC02: manualAttendance nên gọi updateManualAttendance', async () => {
    const dto = { attendances: [] };
    await controller.manualAttendance('m-1', dto);
    expect(service.updateManualAttendance).toHaveBeenCalledWith('m-1', dto);
  });

  it('TC03: updateMeetingMinutes nên gọi service.updateMeetingMinutes', async () => {
    const dto = { minutesUrl: 'http://docs.com' };
    await controller.updateMeetingMinutes('m-1', dto);
    expect(service.updateMeetingMinutes).toHaveBeenCalledWith('m-1', dto);
  });
});