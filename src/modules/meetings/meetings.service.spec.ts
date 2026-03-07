import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsService } from './meetings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingAttendee } from './entities/meeting-attendee.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { PartyCell } from '../party-cells/entities/party-cell.entity';
import { DataSource, Repository } from 'typeorm';
import { 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException 
} from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import { 
  AttendeeStatus, 
  MeetingFormat, 
  MeetingStatus, 
  CheckInMethod 
} from 'src/common/enums';

// Mock thư viện speakeasy
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn().mockReturnValue({ base32: 'MOCK_SECRET' }),
  totp: Object.assign(jest.fn().mockReturnValue('123456'), {
    verify: jest.fn()
  })
}));

describe('MeetingsService', () => {
  let service: MeetingsService;
  let meetingRepo: Repository<Meeting>;
  let attendeeRepo: Repository<MeetingAttendee>;
  let partyMemberRepo: Repository<PartyMember>;
  let partyCellRepo: Repository<PartyCell>;

  // Mock QueryBuilder dằng dặc
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        {
          provide: getRepositoryToken(Meeting),
          useValue: {
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            merge: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MeetingAttendee),
          useValue: {
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PartyMember),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(PartyCell),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: { createQueryRunner: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
    meetingRepo = module.get(getRepositoryToken(Meeting));
    attendeeRepo = module.get(getRepositoryToken(MeetingAttendee));
    partyMemberRepo = module.get(getRepositoryToken(PartyMember));
    partyCellRepo = module.get(getRepositoryToken(PartyCell));
  });

  afterEach(() => jest.clearAllMocks());

  // --- 1. CREATE & PIN ---
  describe('create & getCurrentPin', () => {
    it('create: nên tạo cuộc họp thành công', async () => {
      (partyCellRepo.findOne as jest.Mock).mockResolvedValue({ id: 'cell-1' });
      (meetingRepo.save as jest.Mock).mockResolvedValue({ id: 'm-1' });

      const result = await service.create('u-1', { partyCellId: 'cell-1' } as any);
      expect(result).toBeDefined();
      expect(speakeasy.generateSecret).toHaveBeenCalled();
    });

    it('getCurrentPin: nên trả về mã PIN khi đang mở điểm danh', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({
        id: 'm-1',
        isCheckinActive: true,
        attendanceSecret: 'BASE32SECRET'
      });

      const result = await service.getCurrentPin('m-1');
      expect(result.status).toBe('OPEN');
      expect(result).toHaveProperty('pin');
    });
  });

  // --- 2. CHECK-IN LOGIC ---
  describe('submitCheckIn', () => {
    const dto = { pin: '123456' };

    it('nên ném lỗi nếu mã PIN sai', async () => {
      (partyMemberRepo.findOne as jest.Mock).mockResolvedValue({ id: 'mem-1' });
      mockQueryBuilder.getOne.mockResolvedValue({ isCheckinActive: true });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      await expect(service.submitCheckIn('u-1', 'm-1', dto))
        .rejects.toThrow(BadRequestException);
    });

    it('nên điểm danh thành công nếu PIN đúng', async () => {
      (partyMemberRepo.findOne as jest.Mock).mockResolvedValue({ id: 'mem-1' });
      mockQueryBuilder.getOne.mockResolvedValue({ isCheckinActive: true });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (attendeeRepo.findOne as jest.Mock).mockResolvedValue(null);

      await service.submitCheckIn('u-1', 'm-1', dto);
      expect(attendeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: AttendeeStatus.PRESENT })
      );
    });
  });

  // --- 3. LEAVE REQUESTS ---
  describe('submitLeaveRequest', () => {
    it('nên chặn xin phép nếu cuộc họp đã hoặc đang diễn ra', async () => {
      (meetingRepo.findOne as jest.Mock).mockResolvedValue({ status: MeetingStatus.HAPPENING });

      await expect(service.submitLeaveRequest('m-1', 'mem-1', { reason: 'Busy', proofUrl: 'http://example.com' } as any))
        .rejects.toThrow(BadRequestException);
    });

    it('nên nộp đơn xin phép thành công', async () => {
      (meetingRepo.findOne as jest.Mock).mockResolvedValue({ status: MeetingStatus.SCHEDULED });
      (attendeeRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.submitLeaveRequest('m-1', 'mem-1', { reason: 'Medical', proofUrl: 'http://example.com' } as any);
      expect(result.success).toBe(true);
      expect(attendeeRepo.save).toHaveBeenCalled();
    });
  });

  // --- 4. HEARTBEAT & END MEETING (ONLINE LOGIC) ---
  describe('Online Meeting Logic (2/3 Rule)', () => {
    it('recordHeartbeat: nên cập nhật thời gian checkOut liên tục', async () => {
      (meetingRepo.findOne as jest.Mock).mockResolvedValue({ id: 'm-1' });
      (attendeeRepo.findOne as jest.Mock).mockResolvedValue({ id: 'att-1' });

      await service.recordHeartbeat('m-1', 'mem-1');
      expect(attendeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ checkOutTime: expect.any(Date) })
      );
    });

    it('endMeeting: nên chốt PRESENT nếu online đủ 2/3 thời gian', async () => {
      const now = Date.now();
      const startTime = new Date(now - 3 * 60 * 60 * 1000); // 3 hours ago
      const checkOutTime = new Date(now - 0.5 * 60 * 60 * 1000); // 30 min ago, online 2.5 hours

      const mockMeeting = {
        id: 'm-1',
        startTime,
        format: MeetingFormat.ONLINE,
        status: MeetingStatus.HAPPENING,
        attendees: [{
          status: AttendeeStatus.PENDING,
          checkInTime: startTime,
          checkOutTime: checkOutTime
        }]
      };

      (meetingRepo.findOne as jest.Mock).mockResolvedValue(mockMeeting);
      
      await service.endMeeting('m-1');

      expect(mockMeeting.attendees[0].status).toBe(AttendeeStatus.PRESENT);
      expect(attendeeRepo.save).toHaveBeenCalled();
    });

    it('endMeeting: nên chốt ABSENT nếu online không đủ 2/3 thời gian', async () => {
      const now = Date.now();
      const startTime = new Date(now - 3 * 60 * 60 * 1000); // 3 hours ago
      const checkOutTime = new Date(now - 2 * 60 * 60 * 1000); // 2 hours ago, online 1 hour

      const mockMeeting = {
        id: 'm-1',
        startTime,
        format: MeetingFormat.ONLINE,
        status: MeetingStatus.HAPPENING,
        attendees: [{
          status: AttendeeStatus.PENDING,
          checkInTime: startTime,
          checkOutTime: checkOutTime
        }]
      };

      (meetingRepo.findOne as jest.Mock).mockResolvedValue(mockMeeting);
      await service.endMeeting('m-1');

      expect(mockMeeting.attendees[0].status).toBe(AttendeeStatus.ABSENT);
    });
  });

  // --- 5. SCHEDULE & FILTERS ---
  describe('getMeetingsSchedule', () => {
    it('nên lọc theo khoảng ngày startDate/endDate', async () => {
      const query = { startDate: '2024-01-01', endDate: '2024-01-31' };
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getMeetingsSchedule(query as any);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        expect.stringContaining('startTime >= :startDate'),
        expect.any(Object)
      );
    });
  });
});