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

export enum MeetingTypeEnum {
  REGULAR = 'REGULAR',
  EXTRAORDINARY = 'EXTRAORDINARY',
}
export enum MeetingStatusEnum {
  SCHEDULED = 'SCHEDULED',
  HAPPENING = 'HAPPENING',
  COMPLETED = 'COMPLETED',
}

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
    enum: MeetingTypeEnum,
    default: MeetingTypeEnum.REGULAR,
  })
  type: MeetingTypeEnum;

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
    enum: MeetingStatusEnum,
    default: MeetingStatusEnum.SCHEDULED,
  })
  status: MeetingStatusEnum;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @OneToMany(() => MeetingAttendee, (attendee) => attendee.meeting)
  attendees: MeetingAttendee[];

  @OneToMany(() => MeetingOpinion, (opinion) => opinion.meeting)
  opinions: MeetingOpinion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
