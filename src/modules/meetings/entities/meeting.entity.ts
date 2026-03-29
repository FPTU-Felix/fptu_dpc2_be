import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { PartyCell } from '../../party-cells/entities/party-cell.entity';
import { MeetingAttendee } from './meeting-attendee.entity';
import { MeetingOpinion } from './meeting-opinion.entity';
import {
  MeetingType,
  MeetingStatus,
  MeetingFormat,
  ParticipantType,
} from 'src/common/enums';
import { MeetingDocument } from './meeting-document.entity';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'party_cell_id' })
  partyCellId: string;

  @ManyToOne(() => PartyCell, (cell) => cell.meetings)
  @JoinColumn({ name: 'party_cell_id' })
  partyCell: PartyCell;

  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: MeetingType,
    default: MeetingType.PERIODIC,
  })
  type: MeetingType;

  @Column({
    type: 'enum',
    enum: MeetingFormat,
    default: MeetingFormat.OFFLINE,
  })
  format: MeetingFormat;

  @Column({ name: 'online_link', nullable: true })
  onlineLink: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.SCHEDULED,
  })
  status: MeetingStatus;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'attendance_secret', select: false, nullable: true })
  attendanceSecret: string;

  @Column({ name: 'is_checkin_active', default: false })
  isCheckinActive: boolean;

  @Column({ nullable: true })
  location: string;

  @Column({
    name: 'participant_type',
    type: 'enum',
    enum: ParticipantType,
    default: ParticipantType.ALL,
    nullable: true,
  })
  participantType: ParticipantType;

  @OneToMany(() => MeetingDocument, (doc) => doc.meeting)
  documents: MeetingDocument[];

  @OneToMany(() => MeetingAttendee, (attendee) => attendee.meeting)
  attendees: MeetingAttendee[];

  @OneToMany(() => MeetingOpinion, (opinion) => opinion.meeting)
  opinions: MeetingOpinion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
