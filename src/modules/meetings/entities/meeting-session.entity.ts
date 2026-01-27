import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MeetingAttendee } from './meeting-attendee.entity';

@Entity('meeting_sessions')
export class MeetingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'attendee_id' })
  attendeeId: string;

  @ManyToOne(() => MeetingAttendee, (attendee) => attendee.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attendee_id' })
  attendee: MeetingAttendee;

  @Column({ name: 'join_time', type: 'timestamp' })
  joinTime: Date;

  @Column({ name: 'leave_time', type: 'timestamp', nullable: true })
  leaveTime: Date;

  @Column({ name: 'duration_minutes', default: 0 })
  durationMinutes: number;
}
