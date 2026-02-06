import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingsService } from './meetings.service';
import { MeetingsController } from './meetings.controller';
import { Meeting } from './entities/meeting.entity';
import { MeetingAttendee } from './entities/meeting-attendee.entity';
import { MeetingSession } from './entities/meeting-session.entity';
import { MeetingOpinion } from './entities/meeting-opinion.entity';
import { PartyMember } from '../party-members/entities/party-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Meeting,
      MeetingAttendee,
      MeetingSession,
      MeetingOpinion,
      PartyMember,
    ]),
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
