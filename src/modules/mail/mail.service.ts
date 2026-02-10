import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (apiKey) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn('⚠️ Chưa cấu hình SENDGRID_API_KEY!');
    }
  }

  async sendMail(to: string, subject: string, htmlContent: string) {
    const from =
      this.configService.get<string>('MAIL_FROM') || 'no-reply@example.com';

    const msg = {
      to: to,
      from: from,
      subject: subject,
      html: htmlContent,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`✅ Đã gửi mail thành công đến: ${to}`);
      return true;
    } catch (error) {
      this.logger.error('❌ Lỗi gửi mail SendGrid:', error);
      if (error.response) {
        console.error(JSON.stringify(error.response.body));
      }
      return false;
    }
  }
}
