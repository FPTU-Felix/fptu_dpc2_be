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
    }
  }

  async sendMail(to: string, subject: string, htmlContent: string) {
    // 1. VỆ SINH DỮ LIỆU (QUAN TRỌNG)
    // Nếu to bị null/undefined -> Gán rỗng. Sau đó trim() để cắt khoảng trắng thừa
    const cleanTo = (to || '').trim();

    // 2. KIỂM TRA HỢP LỆ
    if (!cleanTo || !cleanTo.includes('@')) {
      this.logger.error(
        `❌ LỖI: Email người nhận không hợp lệ! Giá trị nhận được là: "${to}"`,
      );
      return false; // Dừng luôn, không gửi sang SendGrid nữa
    }

    const from =
      this.configService.get<string>('MAIL_FROM') || 'no-reply@example.com';

    const msg = {
      to: cleanTo, // Dùng email đã làm sạch
      from: from,
      subject: subject,
      html: htmlContent,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`✅ Đã gửi mail thành công đến: [${cleanTo}]`);
      return true;
    } catch (error) {
      this.logger.error('❌ Lỗi gửi mail SendGrid:', error);
      if (error.response) {
        // In chi tiết lỗi để debug
        console.error(JSON.stringify(error.response.body));
      }
      return false;
    }
  }
}
