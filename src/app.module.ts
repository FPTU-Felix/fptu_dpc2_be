import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PartyMembersModule } from './modules/party-members/party-members.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { PartyCellsModule } from './modules/party-cells/party-cells.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { SystemModule } from './modules/system/system.module';
import { DisciplinesModule } from './modules/disciplines/disciplines.module';
import { AnnualAssessmentsModule } from './modules/annual-assessments/annual-assessments.module';
import { CommendationsModule } from './modules/commendations/commendations.module';
import { PartyFeesModule } from './modules/party-fees/party-fees.module';
import { PartyPositionsModule } from './modules/party-positions/party-positions.module';
import { HandbooksModule } from './modules/handbooks/handbooks.module';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    // 1. Load biến môi trường từ .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Kết nối Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // Để false vì dự án dùng file SQL init hoặc migration
      }),
    }),

    // 3. Cấu hình Mailer (Dùng forRootAsync để inject ConfigService)
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587, // Đổi sang 587
          secure: false, // Port 587 BẮT BUỘC để false
          auth: {
            user: config.get('MAIL_USER'),
            // Xử lý xóa dấu cách ngay tại đây
            pass: config.get('MAIL_PASS')?.replace(/\s/g, ''),
          },
          tls: {
            // Giúp vượt qua lỗi chứng chỉ SSL/TLS không khớp
            rejectUnauthorized: false,
          },
        },
        defaults: {
          from: config.get('MAIL_FROM'),
        },
      }),
    }),

    // 4. Các Module chức năng
    PartyMembersModule,
    UsersModule,
    AuthModule,
    RolesModule,
    PartyCellsModule,
    MeetingsModule,
    SystemModule,
    DisciplinesModule,
    AnnualAssessmentsModule,
    CommendationsModule,
    PartyFeesModule,
    PartyPositionsModule,
    HandbooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
