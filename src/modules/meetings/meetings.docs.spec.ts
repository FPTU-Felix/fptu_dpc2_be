import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsService } from './meetings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingAttendee } from './entities/meeting-attendee.entity';
import { MeetingDocument } from './entities/meeting-document.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { PartyCell } from '../party-cells/entities/party-cell.entity';
import { DataSource } from 'typeorm';
import { MinioService } from '../minio/minio.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttendeeStatus, CheckInMethod } from 'src/common/enums';

describe('MeetingsService - Documents & Manual Attendance', () => {
  let service: MeetingsService;
  let meetingRepo: any;
  let attendeeRepo: any;
  let meetingDocRepo: any;
  let minioService: any;

  const mockMeetingId = 'meeting-uuid';

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
            find: jest.fn(),
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
          },
        },
        {
          provide: getRepositoryToken(MeetingDocument),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
          },
        },
        { provide: getRepositoryToken(PartyMember), useValue: {} },
        { provide: getRepositoryToken(PartyCell), useValue: {} },
        { provide: DataSource, useValue: {} },
        {
          provide: MinioService,
          useValue: { uploadFile: jest.fn() },
        },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
    meetingRepo = module.get(getRepositoryToken(Meeting));
    attendeeRepo = module.get(getRepositoryToken(MeetingAttendee));
    meetingDocRepo = module.get(getRepositoryToken(MeetingDocument));
    minioService = module.get(MinioService);
  });

  // --- PHẦN 1: TẢI TÀI LIỆU (UPLOAD DOCUMENTS) ---
  describe('uploadMeetingDocuments', () => {
    const mockFiles = [
      { originalname: 'bien-ban.pdf', size: 1024 } as Express.Multer.File,
      { originalname: 'anh-hop.jpg', size: 2048 } as Express.Multer.File,
    ];

    it(' Tải lên nhiều tài liệu thành công', async () => {
      meetingRepo.findOne.mockResolvedValue({ id: mockMeetingId });
      minioService.uploadFile.mockImplementation((args: any) => ({
        fileName: args.file.originalname,
        objectName: `meetings/${mockMeetingId}/${args.file.originalname}`,
        size: args.file.size,
      }));

      const result = await service.uploadMeetingDocuments(mockMeetingId, mockFiles);

      expect(result.success).toBe(true);
      expect(result.documents).toHaveLength(2);
      expect(minioService.uploadFile).toHaveBeenCalledTimes(2);
      expect(meetingDocRepo.save).toHaveBeenCalledTimes(2);
      expect(result.documents[0].originalName).toBe('bien-ban.pdf');
    });

    it(' Ném lỗi khi không có file nào được chọn', async () => {
      meetingRepo.findOne.mockResolvedValue({ id: mockMeetingId });
      await expect(service.uploadMeetingDocuments(mockMeetingId, []))
        .rejects.toThrow(BadRequestException);
    });

    it(' Ném lỗi khi cuộc họp không tồn tại', async () => {
      meetingRepo.findOne.mockResolvedValue(null);
      await expect(service.uploadMeetingDocuments('wrong-id', mockFiles))
        .rejects.toThrow(NotFoundException);
    });
  });

  // --- PHẦN 2: ĐIỂM DANH THỦ CÔNG (MANUAL ATTENDANCE) ---
  describe('updateManualAttendance', () => {
    const mockDto = {
      attendances: [
        { memberId: 'member-1', status: AttendeeStatus.PRESENT, reason: 'Có mặt' }, // Đã có trong list
        { memberId: 'member-2', status: AttendeeStatus.ABSENT, reason: 'Ốm' },      // Người mới
      ],
    };

    it(' Cập nhật trạng thái cho người cũ và tạo mới cho người chưa có tên', async () => {
      meetingRepo.findOne.mockResolvedValue({ id: mockMeetingId });
      
      // Giả sử member-1 đã có bản ghi PENDING
      attendeeRepo.find.mockResolvedValue([
        { memberId: 'member-1', status: AttendeeStatus.PENDING, reason: '' }
      ]);

      const result = await service.updateManualAttendance(mockMeetingId, mockDto);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      
      // Kiểm tra xem bản ghi được lưu có dùng CheckInMethod.MANUAL không
      const savedList = attendeeRepo.save.mock.calls[0][0];
      expect(savedList[0].memberId).toBe('member-1');
      expect(savedList[0].method).toBe(CheckInMethod.MANUAL);
      expect(savedList[1].memberId).toBe('member-2');
      expect(savedList[1].status).toBe(AttendeeStatus.ABSENT);
    });

    it(' Xử lý danh sách điểm danh trống', async () => {
      meetingRepo.findOne.mockResolvedValue({ id: mockMeetingId });
      attendeeRepo.find.mockResolvedValue([]);

      const result = await service.updateManualAttendance(mockMeetingId, { attendances: [] });

      expect(result.updatedCount).toBe(0);
      expect(attendeeRepo.save).toHaveBeenCalledWith([]);
    });

    it(' Ném lỗi nếu cuộc họp không tồn tại', async () => {
      meetingRepo.findOne.mockResolvedValue(null);
      await expect(service.updateManualAttendance('id', mockDto))
        .rejects.toThrow(NotFoundException);
    });
  });
});