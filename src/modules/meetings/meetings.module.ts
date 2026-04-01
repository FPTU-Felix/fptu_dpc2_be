import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { Meeting } from './entities/meeting.entity';
import { MeetingAttendee } from './entities/meeting-attendee.entity';
import { MeetingSession } from './entities/meeting-session.entity';
import { MeetingOpinion } from './entities/meeting-opinion.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';
import { MeetingsManagerController } from './meeting.manager.controller';
import { PartyCell } from '../party-cells/entities/party-cell.entity';
import { MeetingsCronService } from './meetings-cron.service';
import { User } from '../users/entities/user.entity';
import { MeetingDocument } from './entities/meeting-document.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meeting,
      MeetingAttendee,
      MeetingSession,
      MeetingOpinion,
      PartyMember,
      PartyCell,
      User,
      MeetingDocument,
    ]),
    NotificationsModule,
    MailModule,
  ],
  controllers: [MeetingsManagerController, MeetingsController],
  providers: [MeetingsService, MeetingsCronService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
