import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingAttendee } from './entities/meeting-attendee.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { PartyCell } from '../party-cells/entities/party-cell.entity';
import { DataSource } from 'typeorm';
import { MeetingsService } from './meetings.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import { AttendeeStatus, MeetingFormat, MeetingStatus, CheckInMethod } from 'src/common/enums';

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn().mockReturnValue({ base32: 'MOCK_SECRET' }),
  totp: Object.assign(jest.fn().mockReturnValue('123456'), {
    verify: jest.fn(),
  }),
}));

describe('MeetingsService', () => {
  let service: MeetingsService;
  let meetingRepo: any;
  let attendeeRepo: any;
  let partyMemberRepo: any;
  let partyCellRepo: any;

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
            create: jest.fn().mockImplementation((dto) => dto),
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
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: getRepositoryToken(PartyMember), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(PartyCell), useValue: { findOne: jest.fn() } },
        { provide: DataSource, useValue: { createQueryRunner: jest.fn() } },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
    meetingRepo = module.get(getRepositoryToken(Meeting));
    attendeeRepo = module.get(getRepositoryToken(MeetingAttendee));
    partyMemberRepo = module.get(getRepositoryToken(PartyMember));
    partyCellRepo = module.get(getRepositoryToken(PartyCell));
  });

  afterEach(() => jest.clearAllMocks());

  // =================================================================
  // 1. NGHIỆP VỤ TẠO CUỘC HỌP (CREATE)
  // =================================================================
  describe('create', () => {
    it('[TC-N]: Tạo cuộc họp ONLINE thành công với đầy đủ link', async () => {
      partyCellRepo.findOne.mockResolvedValue({ id: 'cell-1' });
      const dto = { format: MeetingFormat.ONLINE, onlineLink: 'https://meet.com/abc-defg-hij', startTime: '2026-03-20T10:00:00Z' };
      await service.create('u-1', dto as any);
      expect(meetingRepo.save).toHaveBeenCalled();
    });

    it('[TC-A]: Thất bại khi họp ONLINE mà thiếu onlineLink', async () => {
      const dto = { format: MeetingFormat.ONLINE, onlineLink: '' };
      await expect(service.create('u-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('[TC-B]: Thất bại khi thời gian kết thúc TRÙNG với thời gian bắt đầu', async () => {
      const time = '2026-03-20T10:00:00Z';
      const dto = { startTime: time, endTime: time, format: MeetingFormat.OFFLINE, location: 'A' };
      await expect(service.create('u-1', dto as any)).rejects.toThrow('SAU thời gian bắt đầu');
    });
  });

  // =================================================================
  // 2. NGHIỆP VỤ ĐIỂM DANH PIN (SUBMIT CHECK-IN)
  // =================================================================
  describe('submitCheckIn', () => {
    const dto = { pin: '123456' };
    beforeEach(() => { partyMemberRepo.findOne.mockResolvedValue({ id: 'mem-1' }); });

    it('[TC-A]: Thất bại khi mã PIN sai', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ isCheckinActive: true, attendanceSecret: 'SEC' });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      await expect(service.submitCheckIn('u-1', 'm-1', dto)).rejects.toThrow('Mã xác thực sai');
    });

    it('[TC-B]: Thành công khi PIN đúng ở chu kỳ trễ tối đa (Window 1)', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ isCheckinActive: true, attendanceSecret: 'SEC' });
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      attendeeRepo.findOne.mockResolvedValue(null);
      await service.submitCheckIn('u-1', 'm-1', dto);
      expect(attendeeRepo.save).toHaveBeenCalled();
    });
  });

  // =================================================================
  // 3. LOGIC HEARTBEAT & CHỐNG GIAN LẬN (ONLINE)
  // =================================================================
  describe('recordHeartbeat', () => {
    const fixedNow = new Date('2026-03-20T11:00:00Z');
    const validMeetCode = 'abc-defg-hij'; // Đúng định dạng 3-4-3
    const validUrl = `https://meet.google.com/${validMeetCode}`;

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow); // Khóa thời gian hệ thống
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('[TC-N]: Cộng dồn thời gian khi đạt ngưỡng tối đa 120s', async () => {
      // Đảm bảo (fixedNow - lastPing) luôn bằng chính xác 120.000ms
      const lastPing = new Date(fixedNow.getTime() - 120000); 
      
      meetingRepo.findOne.mockResolvedValue({ 
        format: MeetingFormat.ONLINE, 
        isCheckinActive: true, 
        onlineLink: validUrl 
      });
      attendeeRepo.findOne.mockResolvedValue({ 
        id: 'att-1', 
        checkOutTime: lastPing, 
        onlineDuration: 1000 
      });
      
      await service.recordHeartbeat('m-1', 'mem-1', validUrl);

      // 1000 + 120000 = 121000 (Không bị lệch dù chỉ 1ms)
      expect(attendeeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ onlineDuration: 121000 })
      );
    });

    it('[TC-A]: Thất bại khi sai mã phòng Google Meet (Gian lận URL)', async () => {
      const currentUrl = 'https://meet.google.com/xyz-look-at-me';
      meetingRepo.findOne.mockResolvedValue({ format: MeetingFormat.ONLINE, onlineLink: validUrl, isCheckinActive: true });
      await expect(service.recordHeartbeat('m-1', 'mem-1', currentUrl)).rejects.toThrow('Sai phòng họp!');
    });
  });

  // =================================================================
  // 4. KẾT THÚC HỌP & QUY TẮC 2/3 (END MEETING)
  // =================================================================
  describe('endMeeting 2/3 Rule', () => {
    const now = new Date('2026-03-20T11:00:00Z');
    const startTime = new Date('2026-03-20T08:00:00Z'); // 180p

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });
    afterEach(() => { jest.useRealTimers(); });

    it('[TC-B]: Chốt PRESENT khi online vừa ĐÚNG 120/180 phút', async () => {
      const mockMeeting = {
        id: 'm-1', startTime, format: MeetingFormat.ONLINE, status: MeetingStatus.HAPPENING,
        attendees: [{ status: AttendeeStatus.PENDING, onlineDuration: 120 * 60 * 1000 }]
      };
      meetingRepo.findOne.mockResolvedValue(mockMeeting);
      await service.endMeeting('m-1');
      expect(mockMeeting.attendees[0].status).toBe(AttendeeStatus.PRESENT);
    });

    it('[TC-B]: Chốt ABSENT khi online THIẾU 1ms so với ngưỡng 2/3', async () => {
      const mockMeeting = {
        id: 'm-1', startTime, format: MeetingFormat.ONLINE, status: MeetingStatus.HAPPENING,
        attendees: [{ status: AttendeeStatus.PENDING, onlineDuration: (120 * 60 * 1000) - 1 }]
      };
      meetingRepo.findOne.mockResolvedValue(mockMeeting);
      await service.endMeeting('m-1');
      expect(mockMeeting.attendees[0].status).toBe(AttendeeStatus.ABSENT);
    });
  });
});