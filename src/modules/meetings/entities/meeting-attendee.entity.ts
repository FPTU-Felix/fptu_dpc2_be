import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Meeting } from './meeting.entity';
import { PartyMember } from '../../party-members/entities/party-member.entity';
import { MeetingSession } from './meeting-session.entity';

export enum AttendeeStatusEnum {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  EXCUSED = 'EXCUSED',
}

@Entity('meeting_attendees')
export class MeetingAttendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'meeting_id' })
  meetingId: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.attendees, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => PartyMember)
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column({
    type: 'enum',
    enum: AttendeeStatusEnum,
    default: AttendeeStatusEnum.ABSENT,
  })
  status: AttendeeStatusEnum;

  @Column({ nullable: true })
  reason: string;

  @OneToMany(() => MeetingSession, (session) => session.attendee)
  sessions: MeetingSession[];
}
