import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartyFee, FeeStatusEnum } from './entities/party-fee.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from 'src/common/enums';

@Injectable()
export class PartyFeesCronService {
  private readonly logger = new Logger(PartyFeesCronService.name);

  constructor(
    @InjectRepository(PartyFee)
    private feeRepo: Repository<PartyFee>,
    @InjectRepository(PartyMember)
    private memberRepo: Repository<PartyMember>,
    private notificationsService: NotificationsService,
  ) {}

  @Cron('0 8 1 * *')
  async generateMonthlyFees() {
    this.logger.log('Bắt đầu chạy Cronjob: Tạo bản ghi Đảng phí tháng mới...');
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    try {
      const activeMembers = await this.memberRepo.find({
        relations: ['user'],
      });

      let createdCount = 0;

      for (const member of activeMembers) {
        const existingFee = await this.feeRepo.findOne({
          where: { memberId: member.id, month, year },
        });

        if (!existingFee) {
          const newFee = this.feeRepo.create({
            memberId: member.id,
            month,
            year,
            status: FeeStatusEnum.PENDING,
          });
          await this.feeRepo.save(newFee);
          createdCount++;
          if (member.user) {
            this.notificationsService.createInternal(
              member.user.id,
              `[Đảng phí] Thông báo thu Đảng phí ${month}/${year}`,
              `Đã đến kỳ sinh hoạt Chi bộ và đóng Đảng phí tháng <b>${month}/${year}</b>.<br/>Đồng chí vui lòng nộp cho Chi ủy (Tiền mặt/Chuyển khoản) đúng thời hạn quy định.`,
              NotificationType.PARTY_FEE,
              member.user.email,
            );
          }
        }
      }

      this.logger.log(
        `✅ Chạy xong Cronjob Tạo Đảng phí: Đã tạo ${createdCount} bản ghi cho tháng ${month}/${year}.`,
      );
    } catch (error) {
      this.logger.error('❌ Lỗi khi chạy Cronjob Tạo Đảng phí:', error.message);
    }
  }

  // 8H00 SÁNG NGÀY 25 HÀNG THÁNG
  @Cron('0 8 25 * *')
  async remindUnpaidFees() {
    this.logger.log('Bắt đầu chạy Cronjob: Nhắc nhở Đảng phí chưa đóng...');
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    try {
      const unpaidFees = await this.feeRepo.find({
        where: {
          month,
          year,
          status: FeeStatusEnum.PENDING,
        },
        relations: ['member', 'member.user'],
      });

      let remindedCount = 0;

      for (const fee of unpaidFees) {
        if (fee.member?.user) {
          this.notificationsService.createInternal(
            fee.member.user.id,
            `⚠️ [Nhắc nhở] Đóng Đảng phí tháng ${month}/${year}`,
            `Hệ thống ghi nhận đồng chí chưa hoàn thành việc đóng Đảng phí tháng <b>${month}/${year}</b>.<br/>Chỉ còn vài ngày nữa là hết hạn, đồng chí vui lòng khẩn trương hoàn thành để Chi ủy tổng hợp báo cáo.`,
            NotificationType.PARTY_FEE,
            fee.member.user.email,
          );
          remindedCount++;
        }
      }

      this.logger.log(
        `✅ Chạy xong Cronjob Nhắc nợ: Đã gửi nhắc nhở cho ${remindedCount} đồng chí.`,
      );
    } catch (error) {
      this.logger.error(
        '❌ Lỗi khi chạy Cronjob Nhắc nợ Đảng phí:',
        error.message,
      );
    }
  }
}
