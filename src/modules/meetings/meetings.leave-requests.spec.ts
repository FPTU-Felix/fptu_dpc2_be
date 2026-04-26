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
import {
  AttendeeStatus,
  MeetingStatus,
  NotificationType,
} from 'src/common/enums';

describe('MeetingsService - Leave Requests', () => {
  let service: MeetingsService;
  let meetingRepo: any;
  let attendeeRepo: any;
  let partyMemberRepo: any;
  let minioService: any;
  let notificationsService: any;
  let dataSource: any;

  const mockMeetingId = 'meeting-uuid';
  const mockUserId = 'user-uuid';
  const mockMemberId = 'member-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        {
          provide: getRepositoryToken(Meeting),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(MeetingAttendee),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
          },
        },
        {
          provide: getRepositoryToken(PartyMember),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        { provide: getRepositoryToken(PartyCell), useValue: {} },
        { provide: getRepositoryToken(MeetingDocument), useValue: {} },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn(),
              createQueryBuilder: jest.fn(),
            }),
          },
        },
        {
          provide: MinioService,
          useValue: { uploadFile: jest.fn(), deleteFile: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { createInternal: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
    meetingRepo = module.get(getRepositoryToken(Meeting));
    attendeeRepo = module.get(getRepositoryToken(MeetingAttendee));
    partyMemberRepo = module.get(getRepositoryToken(PartyMember));
    minioService = module.get(MinioService);
    notificationsService = module.get(NotificationsService);
    dataSource = module.get(DataSource);
  });

  // --- PHẦN 1: NỘP ĐƠN XIN NGHỈ (SUBMIT) ---
  describe('submitLeaveRequest', () => {
    const mockFile = {
      originalname: 'don-xin-nghi.pdf',
    } as Express.Multer.File;
    const mockDto = { reason: 'Đi công tác' };

    it(' Nộp đơn thành công và thông báo cho Chi ủy', async () => {
      meetingRepo.findOne.mockResolvedValue({
        id: mockMeetingId,
        status: MeetingStatus.SCHEDULED,
        partyCellId: 'cell-1',
        title: 'Họp tháng',
      });
      partyMemberRepo.findOne.mockResolvedValue({
        id: mockMemberId,
        fullName: 'Nguyễn Văn A',
      });
      attendeeRepo.findOne.mockResolvedValue(null); // Chưa nộp đơn trước đó
      minioService.uploadFile.mockResolvedValue({
        objectName: 'path/to/file.pdf',
      });

      // Mock tìm ban lãnh đạo để gửi thông báo
      partyMemberRepo.find.mockResolvedValue([
        { user: { id: 'boss-1', email: 'boss@test.com' } },
      ]);

      const result = await service.submitLeaveRequest(
        mockMeetingId,
        mockUserId,
        mockDto,
        mockFile,
      );

      expect(result.success).toBe(true);
      expect(minioService.uploadFile).toHaveBeenCalled();
      expect(notificationsService.createInternal).toHaveBeenCalledWith(
        'boss-1',
        expect.stringContaining('Có đơn vắng mặt mới'),
        expect.any(String),
        NotificationType.SUBMISSION,
        'boss@test.com',
      );
    });

    it(' Chặn nộp đơn khi cuộc họp đã kết thúc (FINISHED)', async () => {
      meetingRepo.findOne.mockResolvedValue({
        id: mockMeetingId,
        status: MeetingStatus.FINISHED,
      });
      partyMemberRepo.findOne.mockResolvedValue({ id: mockMemberId });

      await expect(
        service.submitLeaveRequest(
          mockMeetingId,
          mockUserId,
          mockDto,
          mockFile,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it(' Xóa file minh chứng cũ trên MinIO nếu nộp lại đơn', async () => {
      meetingRepo.findOne.mockResolvedValue({
        id: mockMeetingId,
        status: MeetingStatus.SCHEDULED,
      });
      partyMemberRepo.findOne.mockResolvedValue({ id: mockMemberId });

      // Giả lập đã có đơn và có proofUrl cũ
      const oldUrl = `leave-requests/${mockMeetingId}/old-file.pdf`;
      attendeeRepo.findOne.mockResolvedValue({ id: 'att-1', proofUrl: oldUrl });
      minioService.uploadFile.mockResolvedValue({ objectName: 'new-file.pdf' });

      await service.submitLeaveRequest(
        mockMeetingId,
        mockUserId,
        mockDto,
        mockFile,
      );

      expect(minioService.deleteFile).toHaveBeenCalledWith(oldUrl);
    });
  });

  // --- PHẦN 2: PHÊ DUYỆT ĐƠN (REVIEW) ---
  describe('reviewLeaveRequest', () => {
    it(' Chấp nhận đơn và gửi thông báo kết quả cho Đảng viên', async () => {
      const mockAttendee = {
        id: 'att-123',
        status: AttendeeStatus.PENDING_EXCUSE,
        member: { user: { id: 'u1', email: 'u1@test.com' } },
        meeting: { title: 'Họp Chi bộ' },
      };
      attendeeRepo.findOne.mockResolvedValue(mockAttendee);

      const result = await service.reviewLeaveRequest('att-123', {
        status: AttendeeStatus.EXCUSED,
      });

      expect(result.success).toBe(true);
      expect(mockAttendee.status).toBe(AttendeeStatus.EXCUSED);
      expect(notificationsService.createInternal).toHaveBeenCalledWith(
        'u1',
        'Kết quả duyệt đơn xin vắng mặt',
        expect.stringContaining('CHẤP NHẬN'),
        NotificationType.APPROVAL,
        'u1@test.com',
      );
    });

    it(' Ném lỗi nếu duyệt đơn không ở trạng thái PENDING_EXCUSE', async () => {
      attendeeRepo.findOne.mockResolvedValue({
        status: AttendeeStatus.PRESENT,
      });

      await expect(
        service.reviewLeaveRequest('att-123', {
          status: AttendeeStatus.EXCUSED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // --- PHẦN 3: DANH SÁCH ĐƠN (FIND ALL) ---
  describe('findAllLeaveRequests', () => {
    it(' Ném lỗi nếu không tìm thấy hồ sơ Đảng viên của người đang đăng nhập', async () => {
      dataSource.getRepository().findOne.mockResolvedValue(null);

      await expect(
        service.findAllLeaveRequests({ page: 1, limit: 10 }, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
