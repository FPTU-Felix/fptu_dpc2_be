import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsService } from './meetings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingAttendee } from './entities/meeting-attendee.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { PartyCell } from '../party-cells/entities/party-cell.entity';
import { MeetingDocument } from './entities/meeting-document.entity';
import { DataSource } from 'typeorm';
import { MinioService } from '../minio/minio.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MeetingFormat, MeetingStatus, AttendeeStatus } from 'src/common/enums';

// 1. Mock speakeasy chuẩn: hỗ trợ cả speakeasy.totp() và speakeasy.totp.verify()
jest.mock('speakeasy', () => {
  const totpMock: any = jest.fn();
  totpMock.verify = jest.fn();
  return { totp: totpMock };
});
import * as speakeasy from 'speakeasy';

describe('MeetingsService - Attendance (PIN, Heartbeat, Finalize)', () => {
  let service: MeetingsService;
  let meetingRepo: any;
  let attendeeRepo: any;
  let partyMemberRepo: any;
  let mockQueryBuilder: any;

  const mockMeetingId = 'meeting-uuid';
  const mockUserId = 'user-uuid';
  const mockMemberId = 'member-uuid';

  beforeEach(async () => {
    // 2. Khởi tạo mockQueryBuilder mới hoàn toàn cho mỗi test case
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        {
          provide: getRepositoryToken(Meeting),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            // Trả về mockQueryBuilder mới mỗi khi gọi
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(MeetingAttendee),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PartyMember),
          useValue: { findOne: jest.fn() },
        },
        { provide: getRepositoryToken(PartyCell), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(MeetingDocument), useValue: {} },
        { provide: DataSource, useValue: { getRepository: jest.fn() } },
        { provide: MinioService, useValue: { uploadFile: jest.fn(), deleteFile: jest.fn() } },
        { provide: NotificationsService, useValue: { createInternal: jest.fn() } },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
    meetingRepo = module.get(getRepositoryToken(Meeting));
    attendeeRepo = module.get(getRepositoryToken(MeetingAttendee));
    partyMemberRepo = module.get(getRepositoryToken(PartyMember));
  });

  // --- PHẦN 1: MÃ PIN & CHECK-IN (OFFLINE/PIN) ---
  describe('getCurrentPin', () => {
    it(' Lấy mã PIN thành công khi phiên đang mở', async () => {
      // Thiết lập dữ liệu cho Builder của riêng test case này
      mockQueryBuilder.getOne.mockResolvedValue({
        attendanceSecret: 'JBSWY3DPEHPK3PXP',
        isCheckinActive: true,
      });

      (speakeasy.totp as unknown as jest.Mock).mockReturnValue('123456');

      const result = await service.getCurrentPin(mockMeetingId);
      
      expect(result.pin).toBe('123456');
      expect(result.status).toBe('OPEN');
      expect(result.timeRemaining).toBeDefined();
    });

    it(' Ném lỗi khi cuộc họp không tồn tại', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      await expect(service.getCurrentPin(mockMeetingId)).rejects.toThrow(NotFoundException);
    });

    it(' Ném lỗi khi phiên điểm danh đang đóng', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ isCheckinActive: false });
      await expect(service.getCurrentPin(mockMeetingId)).rejects.toThrow(BadRequestException);
    });
  });

  // --- PHẦN 2: ONLINE HEARTBEAT (EXTENSION) -----
  describe('recordHeartbeat', () => {
    const validUrl = 'https://meet.google.com/abc-defg-hij';

    it(' Cộng dồn giây khi heartbeat hợp lệ (60s)', async () => {
      const now = Date.now();
      const lastCheckOut = new Date(now - 60000); 
      
      meetingRepo.findOne.mockResolvedValue({ 
        format: MeetingFormat.ONLINE, 
        onlineLink: validUrl, 
        isCheckinActive: true 
      });
      partyMemberRepo.findOne.mockResolvedValue({ id: mockMemberId });
      attendeeRepo.findOne.mockResolvedValue({ 
        memberId: mockMemberId, 
        checkOutTime: lastCheckOut, 
        onlineDuration: 100 
      });

      jest.useFakeTimers().setSystemTime(now);
      const result = await service.recordHeartbeat(mockMeetingId, mockUserId, validUrl);
      
      expect(result.currentDuration).toBe(160); 
      jest.useRealTimers();
    });

    it(' Không cộng giây nếu khoảng cách > 6 phút (360000ms)', async () => {
      const now = Date.now();
      const lastCheckOut = new Date(now - 400000); 
      meetingRepo.findOne.mockResolvedValue({ format: MeetingFormat.ONLINE, onlineLink: validUrl, isCheckinActive: true });
      partyMemberRepo.findOne.mockResolvedValue({ id: mockMemberId });
      attendeeRepo.findOne.mockResolvedValue({ memberId: mockMemberId, checkOutTime: lastCheckOut, onlineDuration: 100 });

      jest.useFakeTimers().setSystemTime(now);
      const result = await service.recordHeartbeat(mockMeetingId, mockUserId, validUrl);
      
      expect(result.currentDuration).toBe(100); 
      jest.useRealTimers();
    });

    it(' Phát hiện gian lận sai URL Meet', async () => {
      meetingRepo.findOne.mockResolvedValue({ 
        format: MeetingFormat.ONLINE, 
        onlineLink: validUrl,
        isCheckinActive: true 
      });
      partyMemberRepo.findOne.mockResolvedValue({ id: mockMemberId });
      
      await expect(service.recordHeartbeat(mockMeetingId, mockUserId, 'https://meet.google.com/wrong-room-xyz'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // --- PHẦN 3: KẾT THÚC & CHỐT SỔ ---
  describe('endMeeting - Logic 2/3', () => {
    it(' Chốt PRESENT nếu online VỪA ĐỦ 2/3 thời gian', async () => {
      const start = new Date('2026-01-01T08:00:00');
      const end = new Date('2026-01-01T09:30:00'); // 5400s -> 2/3 là 3600s

      const mockMeeting = {
        id: mockMeetingId,
        format: MeetingFormat.ONLINE,
        startTime: start,
        status: MeetingStatus.HAPPENING,
        attendees: [
          { id: 'a1', onlineDuration: 3600, status: AttendeeStatus.PENDING },
          { id: 'a2', onlineDuration: 3599, status: AttendeeStatus.PENDING },
          { id: 'a3', status: AttendeeStatus.EXCUSED },
        ]
      };

      meetingRepo.findOne.mockResolvedValue(mockMeeting);
      jest.useFakeTimers().setSystemTime(end);

      await service.endMeeting(mockMeetingId);

      const savedAttendees = attendeeRepo.save.mock.calls[0][0];
      expect(savedAttendees.find((a: any) => a.id === 'a1').status).toBe(AttendeeStatus.PRESENT);
      expect(savedAttendees.find((a: any) => a.id === 'a2').status).toBe(AttendeeStatus.ABSENT);
      expect(savedAttendees.find((a: any) => a.id === 'a3').status).toBe(AttendeeStatus.EXCUSED);
      
      jest.useRealTimers();
    });

    it(' Báo lỗi nếu kết thúc cuộc họp đã FINISHED', async () => {
      meetingRepo.findOne.mockResolvedValue({ status: MeetingStatus.FINISHED });
      await expect(service.endMeeting(mockMeetingId)).rejects.toThrow(BadRequestException);
    });
  });
});