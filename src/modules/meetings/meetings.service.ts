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

  // ==========================================================
  // 1. TẠO CUỘC HỌP & SINH SECRET
  // ==========================================================
  async create(userId: string, createMeetingDto: CreateMeetingDto) {
    // Speakeasy sinh ra object, ta chỉ lấy chuỗi base32 làm secret
    const secretObj = speakeasy.generateSecret({ length: 20 });
    const secret = secretObj.base32; // Lưu cái này vào DB

    const meeting = this.meetingRepo.create({
      ...createMeetingDto,
      attendanceSecret: secret,
      isCheckinActive: false,
    });

    return await this.meetingRepo.save(meeting);
  }

  // ==========================================================
  // 2. LẤY MÃ PIN HIỆN TẠI (CHO ADMIN)
  // ==========================================================
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

  // ==========================================================
  // 3. XỬ LÝ CHECK-IN (CHO USER)
  // ==========================================================
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

  // ==========================================================
  // 4. BẬT/TẮT ĐIỂM DANH
  // ==========================================================
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
}
