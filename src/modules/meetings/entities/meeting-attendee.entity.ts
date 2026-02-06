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
import { AttendeeStatus } from 'src/common/enums';
import { CheckInMethod } from 'src/common/enums';

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
    enum: AttendeeStatus,
    default: AttendeeStatus.ABSENT,
  })
  status: AttendeeStatus;

  @Column({
    type: 'enum',
    enum: CheckInMethod,
    nullable: true, // Null nếu chưa điểm danh
  })
  method: CheckInMethod;

  @Column({ name: 'check_in_time', type: 'timestamp', nullable: true })
  checkInTime: Date; // Thời điểm nhập mã PIN thành công

  @Column({ nullable: true })
  reason: string;

  @OneToMany(() => MeetingSession, (session) => session.attendee)
  sessions: MeetingSession[];
}
