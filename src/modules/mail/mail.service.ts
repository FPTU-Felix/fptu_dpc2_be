import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendMail(to: string, subject: string, htmlContent: string) {
    const cleanTo = (to || '').trim();

    if (!cleanTo || !cleanTo.includes('@')) {
      this.logger.error(
        `❌ LỖI: Email người nhận không hợp lệ! Giá trị nhận được là: "${to}"`,
      );
      return false;
    }
    const mailOptions = {
      from: `"Hệ thống Quản lý Chi bộ" <${this.configService.get<string>('MAIL_USER')}>`,
      to: cleanTo,
      subject: subject,
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `✅ Đã gửi mail (Nodemailer) thành công đến: [${cleanTo}]`,
      );
      return true;
    } catch (error: any) {
      this.logger.error('❌ Lỗi gửi mail Nodemailer:', error);
      return false;
    }
  }
}
