import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, Between } from 'typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingsService } from './meetings.service';
import { MeetingStatus, MeetingType } from 'src/common/enums';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import * as speakeasy from 'speakeasy';

@Injectable()
export class MeetingsCronService {
  private readonly logger = new Logger(MeetingsCronService.name);

  constructor(
    @InjectRepository(Meeting)
    private meetingRepo: Repository<Meeting>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(PartyMember)
    private partyMemberRepo: Repository<PartyMember>,
    private meetingsService: MeetingsService,
    private mailService: MailService,
  ) {}

  @Cron('59 23 * * *')
  async handleAutoEndOverdueMeetings() {
    this.logger.log(
      '⏳ Bắt đầu chạy Cronjob: Quét và đóng các cuộc họp bị treo...',
    );

    const now = new Date();

    const overdueMeetings = await this.meetingRepo.find({
      where: {
        status: Not(MeetingStatus.FINISHED),
        endTime: LessThan(now),
      },
    });

    if (overdueMeetings.length === 0) {
      this.logger.log('✅ Không có cuộc họp nào bị treo. Hoàn thành Cronjob!');
      return;
    }

    // 2. Xử lý từng cuộc họp
    for (const meeting of overdueMeetings) {
      try {
        await this.meetingsService.endMeeting(meeting.id);

        let userEmail: string | null = null;
        let userName: string = 'Đồng chí';

        if (meeting.createdBy) {
          const user = await this.userRepo.findOne({
            where: { id: meeting.createdBy },
          });

          if (user) {
            userEmail = user.email;
            const partyMember = await this.partyMemberRepo.findOne({
              where: { userId: user.id },
            });

            if (partyMember && partyMember.fullName) {
              userName = partyMember.fullName;
            }
          } else {
            this.logger.warn(
              `⚠️ Không tìm thấy người dùng với ID ${meeting.createdBy} để gửi email thông báo.`,
            );
          }
        }

        const meetingTitle = meeting.title || 'Cuộc họp Chi bộ';

        if (userEmail) {
          const subject = `[Hệ thống Chi bộ] Tự động kết thúc cuộc họp: ${meetingTitle}`;

          const htmlContent = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #d32f2f;">THÔNG BÁO TỰ ĐỘNG KẾT THÚC CUỘC HỌP</h2>
              <p>Kính gửi đồng chí <strong>${userName}</strong>,</p>
              <p>Hệ thống ghi nhận cuộc họp <strong>"${meetingTitle}"</strong> đã vượt quá thời gian dự kiến nhưng chưa được kết thúc trên hệ thống.</p>
              <p>Để đảm bảo tính chính xác của dữ liệu, <strong style="color: #d32f2f;">hệ thống đã tự động kết thúc cuộc họp này và chốt sổ điểm danh</strong> (dựa trên dữ liệu check-in mã PIN hoặc thời gian trực tuyến hiện có).</p>
              <p>Kính đề nghị đồng chí truy cập vào hệ thống thực hiện các bước sau:</p>
              <ul>
                <li>Kiểm tra và sử dụng chức năng <strong>Điểm danh thủ công</strong> để điều chỉnh lại trạng thái điểm danh nếu có sai sót.</li>
                <li>Cập nhật <strong>Link biên bản cuộc họp</strong> để hoàn tất hồ sơ lưu trữ.</li>
              </ul>
              <br/>
              <p>Trân trọng,</p>
              <p><strong>Hệ thống Quản lý Chi bộ</strong></p>
              <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
              <p style="font-size: 12px; color: #999;">Đây là email tự động từ hệ thống, vui lòng không trả lời email này.</p>
            </div>
          `;

          await this.mailService.sendMail(userEmail, subject, htmlContent);
        }

        this.logger.log(`✅ [Auto-End Thành công] Cuộc họp ID: ${meeting.id}`);
      } catch (error: any) {
        // Thêm : any để bỏ lỗi TypeScript
        this.logger.error(
          `❌ [Auto-End Lỗi] Cuộc họp ID ${meeting.id}: ${error.message}`,
        );
      }
    }

    this.logger.log('🎉 Hoàn thành chạy Cronjob đóng cuộc họp!');
  }

  @Cron('0 1 1 * *')
  async handleAutoClonePeriodicMeetings() {
    this.logger.log(
      '🔄 Bắt đầu quét và nhân bản các cuộc họp ĐỊNH KỲ cho tháng mới...',
    );

    const now = new Date();

    // 1. Xác định mốc thời gian của THÁNG TRƯỚC
    const firstDayOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const lastDayOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    // 2. Tìm các cuộc họp định kỳ của tháng trước
    const periodicMeetings = await this.meetingRepo.find({
      where: {
        type: MeetingType.PERIODIC,
        startTime: Between(firstDayOfLastMonth, lastDayOfLastMonth),
      },
    });

    if (periodicMeetings.length === 0) {
      this.logger.log(
        '✅ Tháng trước không có cuộc họp định kỳ nào cần nhân bản.',
      );
      return;
    }
    const clonedMeetings: Meeting[] = [];

    for (const oldMeeting of periodicMeetings) {
      const newStartTime = new Date(oldMeeting.startTime);
      newStartTime.setMonth(newStartTime.getMonth() + 1);
      const newEndTime = new Date(oldMeeting.endTime);
      newEndTime.setMonth(newEndTime.getMonth() + 1);
      const secretObj = speakeasy.generateSecret({ length: 20 });
      const newSecret = secretObj.base32;
      const {
        id,
        createdAt,
        attendanceSecret,
        status,
        isCheckinActive,
        startTime,
        endTime,
        ...restDataToClone
      } = oldMeeting;

      // 3.4. Tạo bản ghi mới bằng data đã lọc
      const newMeeting = this.meetingRepo.create({
        ...restDataToClone,
        startTime: newStartTime,
        endTime: newEndTime,
        attendanceSecret: newSecret,
        type: MeetingType.PERIODIC,
        status: MeetingStatus.SCHEDULED,
        isCheckinActive: false,
      });

      clonedMeetings.push(newMeeting);
    }

    // 4. Lưu toàn bộ cuộc họp mới vào Database
    if (clonedMeetings.length > 0) {
      await this.meetingRepo.save(clonedMeetings);
      this.logger.log(
        `🎉 Đã tự động tạo thành công ${clonedMeetings.length} cuộc họp định kỳ cho tháng này!`,
      );
    }
  }
}
