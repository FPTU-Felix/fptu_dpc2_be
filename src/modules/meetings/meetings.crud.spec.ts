import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsService } from './meetings.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingAttendee } from './entities/meeting-attendee.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { PartyCell } from '../party-cells/entities/party-cell.entity';
import { MeetingDocument } from './entities/meeting-document.entity';
import { DataSource, In } from 'typeorm';
import { MinioService } from '../minio/minio.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MeetingFormat, ParticipantType, UserRole } from 'src/common/enums';

describe('MeetingsService - CRUD & Invitations', () => {
  let service: MeetingsService;
  let meetingRepo: any;
  let attendeeRepo: any;
  let partyMemberRepo: any;
  let partyCellRepo: any;
  let notificationsService: any;

  const mockUserId = 'user-uuid';
  const mockCellId = 'cell-uuid';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        {
          provide: getRepositoryToken(Meeting),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockImplementation((m) => Promise.resolve({ id: 'new-meeting-id', ...m })),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MeetingAttendee),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PartyMember),
          useValue: { find: jest.fn(), findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(PartyCell),
          useValue: { findOne: jest.fn() },
        },
        { provide: getRepositoryToken(MeetingDocument), useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: MinioService, useValue: {} },
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
    partyCellRepo = module.get(getRepositoryToken(PartyCell));
    notificationsService = module.get(NotificationsService);
  });

  // --- PHẦN 1: TẠO CUỘC HỌP (CREATE) ---
  describe('create', () => {
    const baseDto: any = {
      title: 'Họp Chi bộ định kỳ',
      startTime: new Date(Date.now() + 3600000), // 1 tiếng sau
      endTime: new Date(Date.now() + 7200000),   // 2 tiếng sau
      partyCellId: mockCellId,
      participantType: ParticipantType.ALL,
    };

    it(' Ném lỗi nếu họp ONLINE mà thiếu link', async () => {
      const dto = { ...baseDto, format: MeetingFormat.ONLINE, onlineLink: '' };
      await expect(service.create(mockUserId, dto)).rejects.toThrow(BadRequestException);
    });

    it(' Ném lỗi nếu họp OFFLINE mà thiếu địa điểm', async () => {
      const dto = { ...baseDto, format: MeetingFormat.OFFLINE, location: '' };
      await expect(service.create(mockUserId, dto)).rejects.toThrow(BadRequestException);
    });

    it(' Ném lỗi nếu thời gian kết thúc <= thời gian bắt đầu', async () => {
      const dto = { 
        ...baseDto, 
        startTime: new Date('2026-01-01T08:00:00'), 
        endTime: new Date('2026-01-01T08:00:00') 
      };
      await expect(service.create(mockUserId, dto)).rejects.toThrow(BadRequestException);
    });

    it(' Tạo cuộc họp thành công cho TẤT CẢ đảng viên trong chi bộ', async () => {
      partyCellRepo.findOne.mockResolvedValue({ id: mockCellId });
      partyMemberRepo.find.mockResolvedValueOnce([{ id: 'm1' }, { id: 'm2' }]) // Mock cho switch-case
                          .mockResolvedValueOnce([{ id: 'm1', user: { id: 'u1', email: 'u1@test.com' } }, 
                                                  { id: 'm2', user: { id: 'u2', email: 'u2@test.com' } }]); // Mock cho invitation

      const result = await service.create(mockUserId, { ...baseDto, format: MeetingFormat.OFFLINE, location: 'P.Họp A' });

      expect(result.id).toBe('new-meeting-id');
      expect(attendeeRepo.save).toHaveBeenCalled();
      expect(notificationsService.createInternal).toHaveBeenCalledTimes(2);
    });

    it(' Ném lỗi nếu chi bộ không có đảng viên nào để mời (ALL)', async () => {
      partyCellRepo.findOne.mockResolvedValue({ id: mockCellId });
      partyMemberRepo.find.mockResolvedValue([]); // Không có ai

      await expect(service.create(mockUserId, baseDto)).rejects.toThrow(BadRequestException);
    });
  });

  // --- PHẦN 2: CẬP NHẬT CUỘC HỌP (UPDATE) ---
  describe('update', () => {
    it(' Cập nhật thông tin cơ bản và thay đổi danh sách đảng viên', async () => {
      const existingMeeting = { id: 'm-id', partyCellId: mockCellId, participantType: ParticipantType.MANUAL };
      meetingRepo.findOne.mockResolvedValue(existingMeeting);
      
      // Giả sử hiện tại có m1, m2. Update mời m2, m3. => Xóa m1, Thêm m3.
      attendeeRepo.find.mockResolvedValue([{ memberId: 'm1' }, { memberId: 'm2' }]);
      partyMemberRepo.find.mockResolvedValueOnce([{ id: 'm3', user: { id: 'u3', email: 'u3@test.com' } }]); // Thành viên mới thêm

      const updateDto = { title: 'Tiêu đề mới', participantIds: ['m2', 'm3'], participantType: ParticipantType.MANUAL };
      
      await service.update('m-id', updateDto);

      expect(meetingRepo.save).toHaveBeenCalled();
      expect(attendeeRepo.delete).toHaveBeenCalledWith(expect.objectContaining({ memberId: In(['m1']) }));
      expect(attendeeRepo.save).toHaveBeenCalled(); // Lưu m3
      expect(notificationsService.createInternal).toHaveBeenCalled(); // Thông báo cho m3
    });

    it(' Báo lỗi khi update cuộc họp không tồn tại', async () => {
      meetingRepo.findOne.mockResolvedValue(null);
      await expect(service.update('wrong-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  // --- PHẦN 3: XÓA & CHI TIẾT ---
  describe('findOne & remove', () => {
    it(' findOne trả về DTO đã được transform', async () => {
      const mockMeeting = { id: 'id', title: 'Test', attendees: [] };
      meetingRepo.findOne.mockResolvedValue(mockMeeting);

      const result = await service.findOne('id');
      expect(result).toBeDefined();
      expect(meetingRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ relations: expect.any(Array) }));
    });

    it(' remove phải xóa attendee trước khi xóa meeting', async () => {
      meetingRepo.findOne.mockResolvedValue({ id: 'id' });
      
      await service.remove('id');

      expect(attendeeRepo.delete).toHaveBeenCalledWith({ meetingId: 'id' });
      expect(meetingRepo.remove).toHaveBeenCalled();
    });
  });
});