import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as speakeasy from 'speakeasy'; // Import cái này là chạy luôn, không lỗi lầm

import { Meeting } from './entities/meeting.entity';
import { MeetingAttendee } from './entities/meeting-attendee.entity';
import { AttendeeStatus, MeetingFormat, MeetingStatus } from 'src/common/enums';
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
import { UpdateMeetingMinutesDto } from './dto/update-meeting-minutes.dto';

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
  ) {}

  // 1. TẠO CUỘC HỌP & SINH SECRET
  async create(userId: string, createMeetingDto: CreateMeetingDto) {
    const { format, onlineLink, location, startTime, endTime } =
      createMeetingDto;
    // Check Hình thức họp
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
    // Check Logic Thời gian
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
    const secret = secretObj.base32; // Lưu cái này vào DB
    const meeting = this.meetingRepo.create({
      ...createMeetingDto,
      attendanceSecret: secret,
      isCheckinActive: false,
      createdBy: userId,
    });

    return await this.meetingRepo.save(meeting);
  }

  // LẤY MÃ PIN HIỆN TẠI (CHO ADMIN)
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
      // Sinh mã PIN từ secret (mặc định 30s thay đổi 1 lần)
      const pin = speakeasy.totp({
        secret: meeting.attendanceSecret,
        encoding: 'base32',
        digits: 6, // Mã 6 số
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

  // XỬ LÝ CHECK-IN (CHO USER)
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

    // VALIDATE MÃ PIN
    const isValid = speakeasy.totp.verify({
      secret: meeting.attendanceSecret,
      encoding: 'base32',
      token: dto.pin,
      window: 1, // Cho phép trễ 1 chu kỳ (30s) để tránh user nhập chậm bị lỗi
    });

    if (!isValid) {
      throw new BadRequestException('Mã xác thực sai hoặc đã hết hạn');
    }

    // LƯU KẾT QUẢ
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

  // BẬT/TẮT ĐIỂM DANH
  async toggleCheckIn(meetingId: string) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    const currentState = !!meeting.isCheckinActive;
    const newState = !currentState;

    meeting.isCheckinActive = newState;
    await this.meetingRepo.save(meeting);

    return {
      message: newState ? 'Đã MỞ phiên điểm danh' : 'Đã ĐÓNG phiên điểm danh',
      meetingId,
      isCheckinActive: newState,
    };
  }

  // 1. GET ALL (Cho Member xem lịch sử/sắp tới)
  // ========================================================
  // async findAll(filter: FilterMeetingDto) {
  //   const query = this.meetingRepo
  //     .createQueryBuilder('meeting')
  //     .leftJoinAndSelect('meeting.createdBy', 'creator') // Để hiện tên người tạo
  //     .select(['meeting', 'creator.fullName', 'creator.id']);
  //   // Giấu attendanceSecret đi, không select

  //   // Lọc theo thời gian
  //   const now = new Date();
  //   if (filter.type === MeetingTimeFilter.UPCOMING) {
  //     query.where('meeting.time >= :now', { now });
  //     query.orderBy('meeting.time', 'ASC'); // Sắp diễn ra xếp trước
  //   } else if (filter.type === MeetingTimeFilter.PAST) {
  //     query.where('meeting.time < :now', { now });
  //     query.orderBy('meeting.time', 'DESC'); // Mới họp xong xếp trước
  //   } else {
  //     query.orderBy('meeting.time', 'DESC');
  //   }

  //   // Tìm kiếm
  //   if (filter.search) {
  //     query.andWhere('meeting.title ILIKE :search', {
  //       search: `%${filter.search}%`,
  //     });
  //   }

  //   return await query.getMany();
  // }

  // GET ONE (Xem chi tiết)
  async findOne(id: string): Promise<MeetingResponseDto> {
    const meeting = await this.meetingRepo.findOne({
      where: { id },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    return plainToInstance(MeetingResponseDto, meeting, {
      excludeExtraneousValues: true,
    });
  }

  // UPDATE (Cho Admin sửa)
  async update(
    id: string,
    updateMeetingDto: UpdateMeetingDto,
  ): Promise<MeetingResponseDto> {
    // B1: Lấy Entity từ DB lên
    const meetingEntity = await this.meetingRepo.findOne({ where: { id } });
    if (!meetingEntity) throw new NotFoundException('Không tìm thấy cuộc họp');

    const partyCell = await this.partyCellRepo.findOne({
      where: { id: updateMeetingDto.partyCellId },
    });
    if (!partyCell) {
      throw new NotFoundException('Không tìm thấy chi bộ');
    }

    // B2: Merge dữ liệu mới vào Entity
    this.meetingRepo.merge(meetingEntity, updateMeetingDto);

    // B3: Lưu Entity xuống DB
    const savedMeeting = await this.meetingRepo.save(meetingEntity);

    // B4: Lúc này mới chuyển sang DTO để return
    return plainToInstance(MeetingResponseDto, savedMeeting, {
      excludeExtraneousValues: true,
    });
  }

  // REMOVE (Cho Admin hủy)
  async remove(id: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    await this.attendeeRepo.delete({ meetingId: id });

    return await this.meetingRepo.remove(meeting);
  }

  // GET ATTENDEES (Báo cáo điểm danh)
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
      'meeting.minutesUrl',
    ]);
    const meetings = await queryBuilder.getMany();
    return {
      message: 'Lấy lịch họp thành công',
      data: meetings,
    };
  }
  // NGHIỆP VỤ: XIN PHÉP VẮNG MẶT

  // 1. Đảng viên nộp đơn
  async submitLeaveRequest(
    meetingId: string,
    memberId: string,
    dto: SubmitLeaveRequestDto,
  ) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');

    if (
      meeting.status === MeetingStatus.FINISHED ||
      meeting.status === MeetingStatus.HAPPENING
    ) {
      throw new BadRequestException(
        'Chỉ có thể xin phép trước khi cuộc họp diễn ra',
      );
    }

    // Tìm bản ghi điểm danh (Nếu chưa có thì tạo mới)
    let attendee = await this.attendeeRepo.findOne({
      where: { meetingId, memberId },
    });

    if (!attendee) {
      attendee = this.attendeeRepo.create({
        meetingId,
        memberId,
      });
    }

    // Cập nhật trạng thái thành "Chờ duyệt"
    attendee.status = AttendeeStatus.PENDING_EXCUSE;
    attendee.reason = dto.reason;
    attendee.proofUrl = dto.proofUrl;

    await this.attendeeRepo.save(attendee);

    return {
      success: true,
      message: 'Đã gửi đơn xin vắng mặt, vui lòng chờ Chi ủy phê duyệt.',
    };
  }

  // 2. Chi ủy duyệt đơn
  async reviewLeaveRequest(attendeeId: string, dto: ReviewLeaveRequestDto) {
    const attendee = await this.attendeeRepo.findOne({
      where: { id: attendeeId },
    });

    if (!attendee)
      throw new NotFoundException('Không tìm thấy thông tin người tham dự');

    if (attendee.status !== AttendeeStatus.PENDING_EXCUSE) {
      throw new BadRequestException(
        'Chỉ có thể duyệt các đơn đang ở trạng thái chờ (PENDING_EXCUSE).',
      );
    }

    attendee.status = dto.status; // Nhận EXCUSED hoặc ABSENT
    await this.attendeeRepo.save(attendee);

    const statusText =
      dto.status === AttendeeStatus.EXCUSED ? 'CHẤP NHẬN' : 'TỪ CHỐI';

    return {
      success: true,
      message: `Đã ${statusText} đơn xin vắng mặt!`,
    };
  }

  // =========================================================
  // LOGIC ONLINE: CHECK-IN, HEARTBEAT & KẾT THÚC
  // =========================================================

  //Kiểm tra gian lận URL
  private validateMeetUrl(dbLink: string, currentUrl: string) {
    const meetCodeRegex = /[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}/;
    const dbMeetCode = dbLink?.match(meetCodeRegex)?.[0];
    const currentMeetCode = currentUrl?.match(meetCodeRegex)?.[0];

    if (!currentMeetCode || dbMeetCode !== currentMeetCode) {
      throw new BadRequestException('Phát hiện gian lận: Sai phòng họp!');
    }
  }

  // API Check-in
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
    // Check chống đổi link
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
      attendee.checkOutTime = now;
    }

    await this.attendeeRepo.save(attendee);
    return { success: true, message: 'Check-in thành công, bắt đầu tính giờ!' };
  }

  // API Heartbeat (FE gọi LẶP LẠI mỗi 60s)
  async recordHeartbeat(meetingId: string, userId: string, currentUrl: string) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');
    if (meeting.format !== MeetingFormat.ONLINE) {
      throw new BadRequestException(
        'API này chỉ dành cho họp trực tuyến (ONLINE)!',
      );
    }
    const member = await this.partyMemberRepo.findOne({
      where: { userId: userId },
    });
    if (!member)
      throw new ForbiddenException(
        'Tài khoản chưa được liên kết hồ sơ Đảng viên',
      );
    const memberId = member.id;
    if (!meeting.isCheckinActive)
      return { success: false, message: 'Bỏ qua (Meeting đóng)' };
    this.validateMeetUrl(meeting.onlineLink, currentUrl);
    const attendee = await this.attendeeRepo.findOne({
      where: { meetingId, memberId },
    });
    if (!attendee)
      throw new BadRequestException('Vui lòng gọi API Check-in trước!');

    const now = new Date();
    const timeSinceLastPingMs = now.getTime() - attendee.checkOutTime.getTime();
    if (timeSinceLastPingMs <= 300000) {
      const addedSeconds = Math.floor(timeSinceLastPingMs / 1000);
      attendee.onlineDuration += addedSeconds;
    }

    attendee.checkOutTime = now;
    await this.attendeeRepo.save(attendee);

    return { success: true, message: 'Đã đập nhịp tim & cộng dồn giờ!' };
  }

  // API Kết thúc họp & Chốt sổ 2/3
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
      const requiredDurationSeconds = (2 / 3) * meetingDurationSeconds;

      const attendeesToUpdate = meeting.attendees.map((attendee) => {
        if (attendee.status === AttendeeStatus.EXCUSED) return attendee;
        if (attendee.onlineDuration >= requiredDurationSeconds) {
          attendee.status = AttendeeStatus.PRESENT;
        } else {
          attendee.status = AttendeeStatus.ABSENT;
        }
        return attendee;
      });
      await this.attendeeRepo.save(attendeesToUpdate);
    } else {
      const attendeesToUpdate = meeting.attendees.map((attendee) => {
        if (attendee.status === AttendeeStatus.PENDING) {
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
  async updateMeetingMinutes(meetingId: string, dto: UpdateMeetingMinutesDto) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });

    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');

    // NẾU CẦN: M có thể bắt validate chỉ cho phép upload biên bản khi cuộc họp đã kết thúc (FINISHED)
    // if (meeting.status !== MeetingStatus.FINISHED) {
    //   throw new BadRequestException('Chỉ có thể đính kèm biên bản khi cuộc họp đã kết thúc!');
    // }
    meeting.minutesUrl = dto.minutesUrl;

    await this.meetingRepo.save(meeting);

    return {
      success: true,
      message: 'Cập nhật link biên bản cuộc họp thành công!',
      minutesUrl: meeting.minutesUrl,
    };
  }
}
