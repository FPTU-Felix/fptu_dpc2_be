import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
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
import { ThrottlerModule } from '@nestjs/throttler';
import { AiKnowledgeModule } from './modules/ai-knowledge/ai-knowledge.module';

@Module({
  imports: [
    // Cấu hình biến môi trường toàn cục
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 phút
        limit: 10, // 10 requests
      },
    ]),

    // Cấu hình kết nối Database (PostgreSQL)
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
        synchronize: false,
      }),
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST', 'smtp.gmail.com'),
          port: config.get<number>('MAIL_PORT', 587),
          secure: false,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS')?.replace(/\s/g, ''),
          },
          tls: {
            rejectUnauthorized: false,
          },
        },
        defaults: {
          from: config.get(
            'MAIL_FROM',
            '"Hệ thống Quản lý Đảng viên" <no-reply@gmail.com>',
          ),
        },
      }),
    }),
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
    AiKnowledgeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
