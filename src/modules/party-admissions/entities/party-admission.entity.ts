import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { PartyMember } from '../../party-members/entities/party-member.entity';
import { PartyCell } from '../../party-cells/entities/party-cell.entity';
import { Meeting } from '../../meetings/entities/meeting.entity';
import { AdmissionStatusEnum } from 'src/common/enums'; 

@Entity('party_admissions')
export class PartyAdmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @OneToOne(() => PartyMember)
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column({ name: 'party_cell_id' })
  partyCellId: string;

  @ManyToOne(() => PartyCell)
  @JoinColumn({ name: 'party_cell_id' })
  partyCell: PartyCell;

  @Column({
    type: 'enum',
    enum: AdmissionStatusEnum,
    default: AdmissionStatusEnum.DRAFT,
  })
  status: AdmissionStatusEnum;

  @Column({ name: 'application_file_url', nullable: true })
  applicationFileUrl: string;

  @Column({ name: 'resolution_file_url', nullable: true })
  resolutionFileUrl: string;

  @Column({ name: 'admission_documents_url', nullable: true })
  admissionDocumentsUrl: string;

  @Column({ name: 'ceremony_meeting_id', nullable: true })
  ceremonyMeetingId: string;

  @ManyToOne(() => Meeting)
  @JoinColumn({ name: 'ceremony_meeting_id' })
  ceremonyMeeting: Meeting;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}