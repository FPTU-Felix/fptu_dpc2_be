import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    // Lấy API Key từ biến môi trường
    sgMail.setApiKey(this.configService.get<string>('SENDGRID_API_KEY'));
  }

  async sendMail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<boolean> {
    const from = this.configService.get<string>('MAIL_FROM');

    const msg = {
      to: to,
      from: from, // Quan trọng: Phải khớp với email đã verify trên SendGrid
      subject: subject,
      html: htmlContent,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`✅ Mail sent successfully to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error('❌ Error sending mail:', error);
      if (error.response) {
        // In ra lỗi chi tiết nếu SendGrid trả về (ví dụ: 403, 401)
        this.logger.error(JSON.stringify(error.response.body));
      }
      return false;
    }
  }
}
