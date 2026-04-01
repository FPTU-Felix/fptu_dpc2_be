import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { NotificationType } from 'src/common/enums';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notiRepo: Repository<Notification>,
    private readonly mailService: MailService,
  ) {}

  async createInternal(
    recipientId: string,
    title: string,
    content: string,
    type: NotificationType,
    userEmail?: string,
  ) {
    try {
      const noti = this.notiRepo.create({
        recipientId,
        title,
        content,
        type,
      });
      await this.notiRepo.save(noti);
      if (userEmail) {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #da251d; color: white; padding: 15px 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 20px;">HỆ THỐNG QUẢN LÝ CHI BỘ FPTU DPC2</h2>
            </div>
            <div style="padding: 20px; background-color: #fcfcfc;">
              <h3 style="color: #333; margin-top: 0;">${title}</h3>
              <div style="padding: 15px; background-color: #ffffff; border-left: 4px solid #da251d; color: #444; line-height: 1.6; font-size: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                ${content}
              </div>
              <p style="margin-top: 20px; color: #555; font-size: 14px;">
                Vui lòng đăng nhập vào hệ thống để xem chi tiết và xử lý.
              </p>
            </div>
            <div style="background-color: #f1f1f1; padding: 10px; text-align: center; color: #888; font-size: 12px;">
              Đây là email tự động từ hệ thống, vui lòng không trả lời email này.
            </div>
          </div>
        `;
        this.mailService
          .sendMail(userEmail, title, htmlContent)
          .catch((err) =>
            this.logger.error(`Lỗi gửi mail cho ${userEmail}`, err),
          );
      }

      return noti;
    } catch (error: any) {
      this.logger.error(`Lỗi khi tạo thông báo nội bộ: ${error.message}`);
    }
  }

  async getUserNotifications(
    userId: string,
    options: IPaginationOptions,
    isRead?: boolean,
  ) {
    const queryBuilder = this.notiRepo
      .createQueryBuilder('noti')
      .where('noti.recipient_id = :userId', { userId })
      .orderBy('noti.createdAt', 'DESC');

    if (isRead !== undefined) {
      queryBuilder.andWhere('noti.is_read = :isRead', { isRead });
    }

    return await paginate<Notification>(queryBuilder, options);
  }

  async findOne(id: string, userId: string) {
    const noti = await this.notiRepo.findOne({
      where: { id, recipientId: userId },
    });

    if (!noti) throw new NotFoundException('Không tìm thấy thông báo');

    if (!noti.isRead) {
      noti.isRead = true;
      await this.notiRepo.save(noti);
    }

    return noti;
  }
}
