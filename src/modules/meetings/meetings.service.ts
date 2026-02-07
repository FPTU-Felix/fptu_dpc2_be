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
import { AttendeeStatus } from 'src/common/enums';
import { CheckInMethod } from 'src/common/enums';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { CheckInDto } from './dto/check-in.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingAttendee)
    private readonly attendeeRepo: Repository<MeetingAttendee>,
    @InjectRepository(PartyMember)
    private readonly partyMemberRepo: Repository<PartyMember>,
    private readonly dataSource: DataSource,
  ) {}

  // 1. TẠO CUỘC HỌP & SINH SECRET
  async create(userId: string, createMeetingDto: CreateMeetingDto) {
    // Speakeasy sinh ra object, ta chỉ lấy chuỗi base32 làm secret
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
      return { status: 'CLOSED', message: 'Phiên điểm danh chưa mở' };
    }

    try {
      // Sinh mã PIN từ secret (mặc định 30s thay đổi 1 lần)
      const pin = speakeasy.totp({
        secret: meeting.attendanceSecret,
        encoding: 'base32',
        digits: 6, // Mã 6 số
      });

      // Tính thời gian còn lại của chu kỳ 30s hiện tại
      // Công thức: 30 - (giây hiện tại % 30)
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
  async toggleCheckIn(meetingId: string, isActive: boolean) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');

    meeting.isCheckinActive = isActive;
    await this.meetingRepo.save(meeting);

    return {
      message: isActive ? 'Đã MỞ phiên điểm danh' : 'Đã ĐÓNG phiên điểm danh',
      meetingId,
      isCheckinActive: isActive,
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
      relations: ['createdBy'], // Nếu muốn hiện người tạo
    });

    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');

    // CHUẨN BÀI: Map từ Entity -> DTO
    // excludeExtraneousValues: true -> Đảm bảo chỉ lấy những field có @Expose
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
    const meeting = await this.meetingRepo.findOne({ where: { id } }); // Check tồn tại
    if (!meeting) throw new NotFoundException('Không tìm thấy cuộc họp');

    // Xóa tất cả dữ liệu điểm danh liên quan trước (nếu không setup Cascade)
    await this.attendeeRepo.delete({ meetingId: id });

    return await this.meetingRepo.remove(meeting);
  }

  // GET ATTENDEES (Báo cáo điểm danh)
  async getAttendees(meetingId: string) {
    await this.findOne(meetingId);
    return await this.attendeeRepo.find({
      where: { meetingId },
      relations: ['member', 'member.user'],
      order: { checkInTime: 'ASC' }, // Ai đến trước xếp trước
    });
  }
}
