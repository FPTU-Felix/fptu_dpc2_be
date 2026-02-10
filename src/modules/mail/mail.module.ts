import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigModule } from '@nestjs/config';

@Global() // 👈 QUAN TRỌNG: Giúp module này dùng được ở mọi nơi (Auth, User...)
@Module({
  imports: [ConfigModule], // Cần cái này để đọc .env
  providers: [MailService],
  exports: [MailService], // Xuất khẩu Service để bên ngoài dùng được
})
export class MailModule {}
