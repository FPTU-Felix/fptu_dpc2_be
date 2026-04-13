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
import { AttendeeStatus, CheckInMethod } from 'src/common/enums';

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

  @Column({
    type: 'enum',
    enum: AttendeeStatus,
    default: AttendeeStatus.PENDING,
  })
  status: AttendeeStatus;

  @Column({
    type: 'enum',
    enum: CheckInMethod,
    nullable: true,
  })
  method: CheckInMethod;

  @Column({ name: 'check_in_time', type: 'timestamp', nullable: true })
  checkInTime: Date;

  @Column({ nullable: true })
  reason: string;

  @Column({ name: 'proof_url', type: 'varchar', nullable: true })
  proofUrl: string;

  @Column({ name: 'check_out_time', type: 'timestamp', nullable: true })
  checkOutTime: Date;

  @Column({ name: 'online_duration', type: 'int', default: 0 })
  onlineDuration: number;

  @OneToMany(() => MeetingSession, (session) => session.attendee)
  sessions: MeetingSession[];

  @ManyToOne(() => PartyMember, (member) => member.attendees)
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;
}
