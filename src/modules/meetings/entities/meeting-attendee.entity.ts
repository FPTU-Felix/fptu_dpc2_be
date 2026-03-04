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

  @ManyToOne(() => PartyMember)
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column({
    type: 'enum',
    enum: AttendeeStatus,
    default: AttendeeStatus.PENDING,
  })
  status: AttendeeStatus;

  @Column({
    type: 'enum',
    enum: CheckInMethod,
    nullable: true, // Null nếu chưa điểm danh
  })
  method: CheckInMethod;

  @Column({ name: 'check_in_time', type: 'timestamp', nullable: true })
  checkInTime: Date; // Thời điểm nhập mã PIN thành công hoặc bật Extension

  @Column({ nullable: true })
  reason: string;

  @Column({ name: 'proof_url', type: 'varchar', nullable: true })
  proofUrl: string;

  // Lưu thời gian Heartbeat cuối cùng (Dùng để chốt 2/3 thời gian họp Online)
  @Column({ name: 'check_out_time', type: 'timestamp', nullable: true })
  checkOutTime: Date;

  @OneToMany(() => MeetingSession, (session) => session.attendee)
  sessions: MeetingSession[];
}
