import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import * as speakeasy from 'speakeasy';
import { Meeting } from './entities/meeting.entity';
import { MeetingAttendee } from './entities/meeting-attendee.entity';
import {
  AttendeeStatus,
  MeetingFormat,
  MeetingStatus,
  NotificationType,
  ParticipantType,
  UserRole,
} from 'src/common/enums';
import { CheckInMethod } from 'src/common/enums';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { CheckInDto } from './dto/check-in.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';
import { plainToInstance } from 'class-transformer';
import { GetMeetingsQueryDto } from './dto/get-meetings-query.dto';
import {
  ReviewLeaveRequestDto,
  SubmitLeaveRequestDto,
} from './dto/leave-request.dto';
import { PartyCell } from '../party-cells/entities/party-cell.entity';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';
import { MinioService } from '../minio/minio.service';
import { MeetingDocument } from './entities/meeting-document.entity';
import {
  IPaginationOptions,
  paginate,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingAttendee)
    private readonly attendeeRepo: Repository<MeetingAttendee>,
    @InjectRepository(PartyMember)
    private readonly partyMemberRepo: Repository<PartyMember>,
    @InjectRepository(PartyCell)
    private readonly partyCellRepo: Repository<PartyCell>,
    private readonly dataSource: DataSource,
    private minioService: MinioService,
    @InjectRepository(MeetingDocument)
    private readonly meetingDocRepo: Repository<MeetingDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, createMeetingDto: CreateMeetingDto) {
    const {
      format,
      onlineLink,
      location,
      startTime,
      endTime,
      participantIds,
      ...restMeetingData
    } = createMeetingDto;
    if (format === MeetingFormat.ONLINE && !onlineLink) {
      throw new BadRequestException(
        'Họp trực tuyến (ONLINE) bắt buộc phải nhập đường link Google Meet/Zoom!',
      );
    }
    if (format === MeetingFormat.OFFLINE && !location) {
      throw new BadRequestException(
        'Họp trực tiếp (OFFLINE) bắt buộc phải nhập địa điểm phòng họp!',
      );
    }
    if (endTime && new Date(endTime) <= new Date(startTime)) {
      throw new BadRequestException(
        'Thời gian kết thúc phải diễn ra SAU thời gian bắt đầu cuộc họp!',
      );
    }

    const partyCell = await this.partyCellRepo.findOne({
      where: { id: createMeetingDto.partyCellId },
    });

    if (!partyCell) {
      throw new NotFoundException('Không tìm thấy chi bộ');
    }
    const secretObj = speakeasy.generateSecret({ length: 20 });
    const secret = secretObj.base32;
    const meeting = this.meetingRepo.create({
      format,
      onlineLink,
      location,
      startTime,
      endTime,
      ...restMeetingData,
      attendanceSecret: secret,
      isCheckinActive: false,
      createdBy: userId,
    });
    const savedMeeting = await this.meetingRepo.save(meeting);
    let targetMemberIds: string[] = [];
    switch (savedMeeting.participantType) {
      case ParticipantType.ALL: {
        const allMembers = await this.partyMemberRepo.find({
          where: { partyCellId: partyCell.id },
          select: ['id'],
        });
        if (allMembers.length === 0) {
          throw new BadRequestException(
            'Chi bộ chưa có đảng viên nào để mời họp!',
          );
        }
        targetMemberIds = allMembers.map((m) => m.id);
        break;
      }
      case ParticipantType.COMMITTEE: {
        const committeeMembers = await this.partyMemberRepo.find({
          where: {
            partyCellId: partyCell.id,
            user: {
              role: {
                name: In([
                  UserRole.SECRETARY,
                  UserRole.DEPUTY_SECRETARY,
                  UserRole.COMMITTEE_MEMBER,
                ]),
              },
            },
          },
          relations: ['user', 'user.role'],
          select: ['id'],
        });
        if (committeeMembers.length === 0) {
          throw new BadRequestException(
            'Chi bộ chưa có Ban lãnh đạo nào để mời họp!',
          );
        }
        targetMemberIds = committeeMembers.map((m) => m.id);
        break;
      }
      case ParticipantType.MANUAL:
        targetMemberIds = participantIds || [];
        break;
      default:
        targetMemberIds = [];
        break;
    }
    if (targetMemberIds.length > 0) {
      const membersToInvite = await this.partyMemberRepo.find({
        where: { id: In(targetMemberIds) },
        relations: ['user'], // 👈 Cực kỳ quan trọng để lấy email gửi mail
      });

      if (membersToInvite.length !== targetMemberIds.length) {
        throw new NotFoundException(
          'Một hoặc nhiều đảng viên không tồn tại trong hệ thống!',
        );
      }
      const attendeesToInsert = membersToInvite.map((member) => {
        return this.attendeeRepo.create({
          meetingId: savedMeeting.id,
          memberId: member.id,
          status: AttendeeStatus.PENDING,
        });
      });

      await this.attendeeRepo.save(attendeesToInsert);
      const formatText =
        format === MeetingFormat.ONLINE ? 'Trực tuyến' : 'Trực tiếp';
      const locationText =
        format === MeetingFormat.ONLINE ? onlineLink : location;
      for (const member of membersToInvite) {
        if (member.user) {
          this.notificationsService.createInternal(
            member.user.id,
            `Mời họp: ${savedMeeting.title}`,
            `Đồng chí có lịch mời họp <b>${formatText}</b> vào lúc <b>${new Date(startTime).toLocaleString('vi-VN')}</b>.<br/>Địa điểm/Link: ${locationText}.<br/>Vui lòng sắp xếp thời gian tham gia đúng giờ.`,
            NotificationType.MEETING,
            member.user.email,
          );
        }
      }
    }

    return {
      ...savedMeeting,
      totalAttendees: targetMemberIds.length,
    };
  }

  async getCurrentPin(meetingId: string) {
    const meeting = await this.meetingRepo
      .createQueryBuilder('meeting')
      .where('meeting.id = :id', { id: meetingId })
      .addSelect('meeting.attendanceSecret')
      .addSelect('meeting.isCheckinActive')
      .getOne();
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    if (!meeting.isCheckinActive) {
      throw new BadRequestException('Phiên điểm danh chưa mở hoặc đã kết thúc');
    }
    try {
      const pin = speakeasy.totp({
        secret: meeting.attendanceSecret,
        encoding: 'base32',
        digits: 6,
      });
      const timeRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);

      return {
        status: 'OPEN',
        pin,
        timeRemaining,
      };
    } catch (error) {
      console.error('Lỗi sinh mã PIN:', error);
      throw new BadRequestException('Lỗi hệ thống khi sinh mã xác thực');
    }
  }

  async submitCheckIn(userId: string, meetingId: string, dto: CheckInDto) {
    const member = await this.partyMemberRepo.findOne({ where: { userId } });
    if (!member)
      throw new BadRequestException('Tài khoản này chưa có hồ sơ Đảng viên');

    const meeting = await this.meetingRepo
      .createQueryBuilder('meeting')
      .where('meeting.id = :id', { id: meetingId })
      .addSelect('meeting.attendanceSecret')
      .addSelect('meeting.isCheckinActive')
      .getOne();

    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');
    if (!meeting.isCheckinActive)
      throw new ForbiddenException('Phiên điểm danh hiện đang đóng');

    const isValid = speakeasy.totp.verify({
      secret: meeting.attendanceSecret,
      encoding: 'base32',
      token: dto.pin,
      window: 1,
    });

    if (!isValid) {
      throw new BadRequestException('Mã xác thực sai hoặc đã hết hạn');
    }

    let attendee = await this.attendeeRepo.findOne({
      where: { meetingId, memberId: member.id },
    });

    if (attendee) {
      attendee.status = AttendeeStatus.PRESENT;
      attendee.method = CheckInMethod.PIN_CODE;
      attendee.checkInTime = new Date();
    } else {
      attendee = this.attendeeRepo.create({
        meetingId,
        memberId: member.id,
        status: AttendeeStatus.PRESENT,
        method: CheckInMethod.PIN_CODE,
        checkInTime: new Date(),
      });
    }

    return await this.attendeeRepo.save(attendee);
  }

  async toggleCheckIn(meetingId: string) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });

    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');

    const currentState = !!meeting.isCheckinActive;
    const newState = !currentState;

    meeting.isCheckinActive = newState;
    if (newState === true && meeting.status !== MeetingStatus.HAPPENING) {
      meeting.startTime = new Date();
      meeting.status = MeetingStatus.HAPPENING;
    }

    await this.meetingRepo.save(meeting);

    return {
      message: newState ? 'Đã MỞ phiên điểm danh' : 'Đã ĐÓNG phiên điểm danh',
      meetingId,
      isCheckinActive: newState,
      // Trả về thêm startTime để FE biết (nếu cần)
      actualStartTime: meeting.startTime,
    };
  }

  async findOne(id: string): Promise<MeetingResponseDto> {
    const meeting = await this.meetingRepo.findOne({
      where: { id },
      relations: [
        'attendees',
        'attendees.member',
        'attendees.member.user',
        'documents',
      ],
    });

    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');

    return plainToInstance(MeetingResponseDto, meeting, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateMeetingDto: UpdateMeetingDto) {
    const meeting = await this.meetingRepo.findOne({
      where: { id },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');

    const { participantIds, participantType, ...updateData } = updateMeetingDto;
    Object.assign(meeting, updateData);

    if (participantType) {
      meeting.participantType = participantType;
    }
    await this.meetingRepo.save(meeting);

    if (participantType || participantIds) {
      const actualType = participantType || meeting.participantType;
      let targetMemberIds: string[] = [];

      switch (actualType) {
        case ParticipantType.ALL: {
          const allMembers = await this.partyMemberRepo.find({
            where: { partyCellId: meeting.partyCellId },
            select: ['id'],
          });
          targetMemberIds = allMembers.map((m) => m.id);
          break;
        }
        case ParticipantType.COMMITTEE: {
          const committeeMembers = await this.partyMemberRepo.find({
            where: {
              partyCellId: meeting.partyCellId,
              user: {
                role: {
                  name: In([
                    UserRole.SECRETARY,
                    UserRole.DEPUTY_SECRETARY,
                    UserRole.COMMITTEE_MEMBER,
                  ]),
                },
              },
            },
            relations: ['user', 'user.role'],
            select: ['id'],
          });
          targetMemberIds = committeeMembers.map((m) => m.id);
          break;
        }
        case ParticipantType.MANUAL:
          targetMemberIds = participantIds || [];
          break;
      }

      const currentAttendees = await this.attendeeRepo.find({
        where: { meetingId: id },
      });
      const currentMemberIds = currentAttendees.map((a) => a.memberId);

      const membersToAdd = targetMemberIds.filter(
        (targetId) => !currentMemberIds.includes(targetId),
      );
      const membersToRemove = currentMemberIds.filter(
        (currentId) => !targetMemberIds.includes(currentId),
      );
      if (membersToAdd.length > 0) {
        const newMembersInfo = await this.partyMemberRepo.find({
          where: { id: In(membersToAdd) },
          relations: ['user'],
        });

        const attendeesToInsert = newMembersInfo.map((member) =>
          this.attendeeRepo.create({
            meetingId: id,
            memberId: member.id,
            status: AttendeeStatus.PENDING,
          }),
        );
        await this.attendeeRepo.save(attendeesToInsert);
        const formatText =
          meeting.format === MeetingFormat.ONLINE ? 'Trực tuyến' : 'Trực tiếp';
        const locationText =
          meeting.format === MeetingFormat.ONLINE
            ? meeting.onlineLink
            : meeting.location;

        for (const member of newMembersInfo) {
          if (member.user) {
            this.notificationsService.createInternal(
              member.user.id,
              `Bổ sung lịch họp: ${meeting.title}`,
              `Đồng chí vừa được bổ sung vào danh sách mời họp <b>${formatText}</b> vào lúc <b>${new Date(meeting.startTime).toLocaleString('vi-VN')}</b>.<br/>Địa điểm/Link: ${locationText}.<br/>Vui lòng sắp xếp thời gian tham gia đúng giờ.`,
              NotificationType.MEETING,
              member.user.email,
            );
          }
        }
      }
      if (membersToRemove.length > 0) {
        await this.attendeeRepo.delete({
          meetingId: id,
          memberId: In(membersToRemove),
          status: AttendeeStatus.PENDING, // Chỉ xóa những người chưa điểm danh
        });
      }
    }

    return await this.meetingRepo.findOne({
      where: { id },
    });
  }

  async remove(id: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    await this.attendeeRepo.delete({ meetingId: id });

    return await this.meetingRepo.remove(meeting);
  }

  async getAttendees(meetingId: string) {
    await this.findOne(meetingId);
    return await this.attendeeRepo.find({
      where: { meetingId },
      relations: ['member', 'member.user'],
      order: { checkInTime: 'ASC' },
    });
  }

  async getMeetingsSchedule(query: GetMeetingsQueryDto) {
    const { month, year, startDate, endDate } = query;
    const queryBuilder = this.meetingRepo.createQueryBuilder('meeting');
    if (startDate && endDate) {
      const parsedStartDate = new Date(`${startDate}T00:00:00.000Z`);
      const parsedEndDate = new Date(`${endDate}T23:59:59.999Z`);

      queryBuilder
        .where('meeting.startTime >= :startDate', {
          startDate: parsedStartDate,
        })
        .andWhere('meeting.startTime <= :endDate', { endDate: parsedEndDate });
    } else if (month && year) {
      const numMonth = parseInt(month, 10);
      const numYear = parseInt(year, 10);
      const calcStartDate = new Date(numYear, numMonth - 1, 1);
      const calcEndDate = new Date(numYear, numMonth, 0, 23, 59, 59);
      queryBuilder
        .where('meeting.startTime >= :startDate', { startDate: calcStartDate })
        .andWhere('meeting.startTime <= :endDate', { endDate: calcEndDate });
    }
    queryBuilder.orderBy('meeting.startTime', 'ASC');

    queryBuilder.select([
      'meeting.id',
      'meeting.title',
      'meeting.startTime',
      'meeting.endTime',
      'meeting.location',
      'meeting.status',
      'meeting.format',
      'meeting.onlineLink',
    ]);
    const meetings = await queryBuilder.getMany();
    return {
      message: 'Lấy lịch họp thành công',
      data: meetings,
    };
  }

  async submitLeaveRequest(
    meetingId: string,
    userId: string,
    dto: SubmitLeaveRequestDto,
    file: Express.Multer.File,
  ) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    const member = await this.partyMemberRepo.findOne({
      where: { userId: userId },
      relations: ['user'],
    });
    if (!member) throw new NotFoundException('Không tìm thấy đảng viên');

    if (
      meeting.status === MeetingStatus.FINISHED ||
      meeting.status === MeetingStatus.HAPPENING
    ) {
      throw new BadRequestException(
        'Chỉ có thể xin phép trước khi cuộc họp diễn ra',
      );
    }

    let attendee = await this.attendeeRepo.findOne({
      where: { meetingId, memberId: member.id },
    });

    if (!attendee) {
      attendee = this.attendeeRepo.create({
        meetingId,
        memberId: member.id,
      });
    }
    if (attendee.proofUrl) {
      try {
        const parts = attendee.proofUrl.split(`leave-requests/${meetingId}/`);
        if (parts.length === 2) {
          const oldObjectName = `leave-requests/${meetingId}/${parts[1]}`;
          await this.minioService.deleteFile(oldObjectName);
          console.log(
            `[MinIO] Đã dọn dẹp file minh chứng cũ: ${oldObjectName}`,
          );
        }
      } catch (error) {
        console.error('Lỗi khi dọn dẹp file MinIO cũ:', error.message);
      }
    }

    const uploadResult = await this.minioService.uploadFile({
      file: file,
      folder: `leave-requests/${meetingId}`,
    });

    attendee.status = AttendeeStatus.PENDING_EXCUSE;
    attendee.reason = dto.reason;
    attendee.proofUrl = uploadResult.objectName;
    await this.attendeeRepo.save(attendee);
    try {
      const committeeMembers = await this.partyMemberRepo.find({
        where: {
          partyCellId: meeting.partyCellId,
          user: {
            role: {
              name: In([
                UserRole.SECRETARY,
                UserRole.DEPUTY_SECRETARY,
                UserRole.COMMITTEE_MEMBER,
              ]),
            },
          },
        },
        relations: ['user', 'user.role'],
      });

      const submitterName = member.fullName;
      for (const boss of committeeMembers) {
        if (boss.user) {
          this.notificationsService.createInternal(
            boss.user.id,
            `[Đơn xin phép] Có đơn vắng mặt mới`,
            `Đồng chí <b>${submitterName}</b> vừa nộp đơn xin phép vắng mặt cho cuộc họp: <b>${meeting.title}</b>.<br/>
            Lý do: <i>${dto.reason}</i>.<br/>
            Kính đề nghị Chi ủy vào hệ thống kiểm tra minh chứng và phê duyệt.`,
            NotificationType.SUBMISSION,
            boss.user.email,
          );
        }
      }
    } catch (error) {
      console.error(
        'Lỗi khi gửi thông báo xin phép cho Chi ủy:',
        error.message,
      );
    }

    return {
      success: true,
      message: 'Đã gửi đơn xin vắng mặt, vui lòng chờ Chi ủy phê duyệt.',
      proofUrl: uploadResult.objectName,
    };
  }

  async reviewLeaveRequest(attendeeId: string, dto: ReviewLeaveRequestDto) {
    const attendee = await this.attendeeRepo.findOne({
      where: { id: attendeeId },
      relations: ['member', 'member.user', 'meeting'],
    });

    if (!attendee)
      throw new NotFoundException('Không tìm thấy thông tin người tham dự');

    if (attendee.status !== AttendeeStatus.PENDING_EXCUSE) {
      throw new BadRequestException(
        'Chỉ có thể duyệt các đơn đang ở trạng thái chờ (PENDING_EXCUSE).',
      );
    }
    attendee.status = dto.status;
    await this.attendeeRepo.save(attendee);

    const isApproved = dto.status === AttendeeStatus.EXCUSED;
    const statusText = isApproved ? 'CHẤP NHẬN' : 'TỪ CHỐI';
    const meetingTitle = attendee.meeting?.title || 'Không xác định';
    if (attendee.member?.user) {
      const user = attendee.member.user;
      const colorText = isApproved ? '#28a745' : '#dc3545';

      this.notificationsService.createInternal(
        user.id,
        `Kết quả duyệt đơn xin vắng mặt`, // Tiêu đề Noti
        `Đơn xin phép vắng mặt của đồng chí cho cuộc họp <b>${meetingTitle}</b> đã bị Chi ủy <b style="color: ${colorText}">${statusText}</b>.<br/>
        ${isApproved ? 'Đồng chí không cần tham gia cuộc họp này.' : 'Vui lòng sắp xếp công việc để tham gia cuộc họp đầy đủ theo quy định.'}`,
        NotificationType.APPROVAL, // Dùng loại APPROVAL (Phê duyệt)
        user.email, // Bắn mail luôn
      );
    }

    return {
      success: true,
      message: `Đã ${statusText} đơn xin vắng mặt!`,
    };
  }

  private validateMeetUrl(dbLink: string, currentUrl: string) {
    const meetCodeRegex = /[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}/;
    const dbMeetCode = dbLink?.match(meetCodeRegex)?.[0];
    const currentMeetCode = currentUrl?.match(meetCodeRegex)?.[0];

    if (!currentMeetCode || dbMeetCode !== currentMeetCode) {
      throw new BadRequestException('Phát hiện gian lận: Sai phòng họp!');
    }
  }

  async onlineCheckIn(meetingId: string, userId: string, currentUrl: string) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    if (meeting.status === MeetingStatus.FINISHED) {
      throw new BadRequestException(
        'Cuộc họp đã kết thúc, không thể check-in!',
      );
    }
    if (meeting.format !== MeetingFormat.ONLINE) {
      throw new BadRequestException(
        'API này chỉ dành cho họp trực tuyến (ONLINE)!',
      );
    }
    if (!meeting.isCheckinActive)
      throw new BadRequestException('Cổng điểm danh đang đóng!');
    const member = await this.partyMemberRepo.findOne({
      where: { userId: userId },
    });
    if (!member)
      throw new ForbiddenException(
        'Tài khoản chưa được liên kết hồ sơ Đảng viên',
      );
    const memberId = member.id;
    this.validateMeetUrl(meeting.onlineLink, currentUrl);

    let attendee = await this.attendeeRepo.findOne({
      where: { meetingId, memberId },
    });
    const now = new Date();

    if (!attendee) {
      attendee = this.attendeeRepo.create({
        meetingId,
        memberId,
        checkInTime: now,
        checkOutTime: now,
        onlineDuration: 0,
        method: CheckInMethod.ONLINE_EXT,
        status: AttendeeStatus.PENDING,
      });
    } else {
      if (!attendee.checkInTime) {
        attendee.checkInTime = now;
        attendee.method = CheckInMethod.ONLINE_EXT;
        attendee.status = AttendeeStatus.PRESENT;
      } else {
        attendee.checkOutTime = now;
      }
    }

    await this.attendeeRepo.save(attendee);
    return { success: true, message: 'Check-in thành công, bắt đầu tính giờ!' };
  }

  // API Heartbeat (FE gọi LẶP LẠI mỗi 60s)
  async recordHeartbeat(meetingId: string, userId: string, currentUrl: string) {
    // 1. Kiểm tra cuộc họp
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');

    if (meeting.format !== MeetingFormat.ONLINE) {
      throw new BadRequestException(
        'API này chỉ dành cho họp trực tuyến (ONLINE)!',
      );
    }

    // 2. Kiểm tra hồ sơ Đảng viên
    const member = await this.partyMemberRepo.findOne({
      where: { userId: userId },
    });
    if (!member) {
      throw new ForbiddenException(
        'Tài khoản chưa được liên kết hồ sơ Đảng viên',
      );
    }
    const memberId = member.id;

    if (!meeting.isCheckinActive) {
      return { success: false, message: 'Bỏ qua (Meeting đóng)' };
    }

    this.validateMeetUrl(meeting.onlineLink, currentUrl);

    const attendee = await this.attendeeRepo.findOne({
      where: { meetingId, memberId },
    });
    if (!attendee) {
      throw new BadRequestException('Vui lòng gọi API Check-in trước!');
    }
    const now = new Date();

    if (attendee.checkOutTime) {
      // Đảm bảo ép kiểu Date an toàn đề phòng DB trả về String
      const timeSinceLastPingMs =
        now.getTime() - new Date(attendee.checkOutTime).getTime();

      if (timeSinceLastPingMs > 0 && timeSinceLastPingMs <= 360000) {
        const addedSeconds = Math.floor(timeSinceLastPingMs / 1000);
        attendee.onlineDuration = (attendee.onlineDuration || 0) + addedSeconds;
      }
    } else {
      attendee.onlineDuration = attendee.onlineDuration || 0;
    }
    attendee.checkOutTime = now;
    await this.attendeeRepo.save(attendee);

    return {
      success: true,
      message: 'Đã đập nhịp tim & cộng dồn giờ!',
      currentDuration: attendee.onlineDuration,
    };
  }

  async endMeeting(meetingId: string) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['attendees'],
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    if (meeting.status === MeetingStatus.FINISHED) {
      throw new BadRequestException('Cuộc họp này đã kết thúc từ trước rồi!');
    }

    meeting.status = MeetingStatus.FINISHED;
    meeting.endTime = new Date();
    meeting.isCheckinActive = false;

    if (meeting.format === MeetingFormat.ONLINE) {
      const meetingDurationSeconds = Math.floor(
        (meeting.endTime.getTime() - meeting.startTime.getTime()) / 1000,
      );
      const validMeetingDuration = Math.max(0, meetingDurationSeconds);
      const requiredDurationSeconds = (2 / 3) * validMeetingDuration;
      console.log(
        `[DEBUG CHỐT SỔ] Tổng thời gian Meeting: ${validMeetingDuration}s. Yêu cầu để Điểm danh thành công: >= ${requiredDurationSeconds}s`,
      );

      const attendeesToUpdate = meeting.attendees.map((attendee) => {
        if (attendee.status === AttendeeStatus.EXCUSED) return attendee;

        const userOnlineDuration = attendee.onlineDuration || 0;

        if (userOnlineDuration >= requiredDurationSeconds) {
          attendee.status = AttendeeStatus.PRESENT;
        } else {
          attendee.status = AttendeeStatus.ABSENT;
        }

        return attendee;
      });

      await this.attendeeRepo.save(attendeesToUpdate);
    }
    await this.meetingRepo.save(meeting);

    return { message: 'Đã kết thúc cuộc họp & chốt sổ điểm danh tự động!' };
  }

  async updateManualAttendance(
    meetingId: string,
    dto: ManualAttendanceDto,
    // userId: string,
  ) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    const existingAttendees = await this.attendeeRepo.find({
      where: { meetingId },
    });

    const attendeesToSave: MeetingAttendee[] = [];

    for (const item of dto.attendances) {
      let attendee = existingAttendees.find(
        (a) => a.memberId === item.memberId,
      );

      if (attendee) {
        attendee.status = item.status;
        attendee.reason = item.reason || attendee.reason;
        attendee.method = CheckInMethod.MANUAL;
      } else {
        attendee = this.attendeeRepo.create({
          meetingId,
          memberId: item.memberId,
          status: item.status,
          reason: item.reason,
          method: CheckInMethod.MANUAL,
          checkInTime: new Date(),
        });
      }
      attendeesToSave.push(attendee);
    }
    await this.attendeeRepo.save(attendeesToSave);

    return {
      success: true,
      message: 'Cập nhật điểm danh thủ công thành công!',
      updatedCount: attendeesToSave.length,
    };
  }
  async uploadMeetingDocuments(
    meetingId: string,
    files: Express.Multer.File[],
  ) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 file để tải lên!');
    }
    const savedDocuments: MeetingDocument[] = [];
    for (const file of files) {
      const uploadedInfo = await this.minioService.uploadFile({
        file: file,
        folder: `meetings/${meetingId}`,
      });

      const newDoc = this.meetingDocRepo.create({
        meetingId,
        originalName: uploadedInfo.fileName,
        fileUrl: uploadedInfo.objectName,
        fileSize: uploadedInfo.size,
      });

      const savedDoc = await this.meetingDocRepo.save(newDoc);
      savedDocuments.push(savedDoc);
    }

    return {
      success: true,
      message: `Đã tải lên thành công ${savedDocuments.length} tài liệu!`,
      documents: savedDocuments,
    };
  }

  async findAllLeaveRequests(
    options: IPaginationOptions,
    userId: string,
    status?: AttendeeStatus,
  ): Promise<Pagination<any>> {
    const currentUser = await this.dataSource
      .getRepository(PartyMember)
      .findOne({
        where: { userId: userId },
        relations: ['user', 'user.role'],
      });

    if (!currentUser) {
      throw new NotFoundException(
        'Không tìm thấy thông tin Đảng viên của bạn!',
      );
    }
    const queryBuilder = this.dataSource
      .getRepository(MeetingAttendee)
      .createQueryBuilder('attendee')
      .leftJoinAndSelect('attendee.member', 'member')
      .leftJoinAndSelect('attendee.meeting', 'meeting')
      .leftJoinAndSelect('member.partyCell', 'cell');
    if (currentUser.user?.role?.name !== UserRole.ADMIN) {
      queryBuilder.andWhere('member.party_cell_id = :partyCellId', {
        partyCellId: currentUser.partyCellId,
      });
    }

    if (status) {
      queryBuilder.andWhere('attendee.status = :status', { status });
    } else {
      queryBuilder.andWhere('attendee.status IN (:...statuses)', {
        statuses: [
          AttendeeStatus.PENDING_EXCUSE,
          AttendeeStatus.EXCUSED,
          AttendeeStatus.ABSENT,
        ],
      });
    }
    queryBuilder.orderBy('meeting.startTime', 'DESC');
    const result = await paginate<MeetingAttendee>(queryBuilder, options);
    return new Pagination(
      result.items.map((item) => ({
        id: item.id,
        status: item.status,
        reason: item.reason,
        proofUrl: item.proofUrl,
        member: {
          id: item.member?.id,
          fullName: item.member?.fullName,
        },
        meeting: {
          id: item.meeting?.id,
          title: item.meeting?.title,
          startTime: item.meeting?.startTime,
          location: item.meeting?.location,
        },
        partyCellName: item.member?.partyCell?.name || 'Không xác định',
      })),
      result.meta,
      result.links,
    );
  }
}
