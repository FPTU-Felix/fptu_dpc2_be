import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { PartyPosition } from './party-position.entity';
import { PartyMember } from '../../party-members/entities/party-member.entity';
import { PartyCell } from '../../party-cells/entities/party-cell.entity';

@Entity('party_member_positions')
export class PartyMemberPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => PartyMember, (member) => member.positions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column({ name: 'position_id' })
  positionId: string;

  @ManyToOne(() => PartyPosition, (pos) => pos.positionHistory)
  @JoinColumn({ name: 'position_id' })
  position: PartyPosition;

  // Lưu thêm Chi bộ tại thời điểm giữ chức (phòng trường hợp chuyển sinh hoạt)
  @Column({ name: 'party_cell_id', nullable: true })
  partyCellId: string;

  @ManyToOne(() => PartyCell)
  @JoinColumn({ name: 'party_cell_id' })
  partyCell: PartyCell;

  @Column({ name: 'appointed_date', type: 'timestamp' })
  appointedDate: Date; // Ngày bổ nhiệm

  @Column({ name: 'dismissed_date', type: 'timestamp', nullable: true })
  dismissedDate: Date; // Ngày miễn nhiệm (Null = Đang giữ chức)

  @Column({ name: 'is_current', default: true })
  isCurrent: boolean; // Cờ đánh dấu chức vụ hiện tại cho dễ query

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
