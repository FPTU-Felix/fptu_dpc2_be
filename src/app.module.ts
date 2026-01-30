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

@Module({
  imports: [
    // Load biến môi trường từ .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Kết nối Database
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
        synchronize: false, // Để false vì ta dùng file SQL init rồi
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
