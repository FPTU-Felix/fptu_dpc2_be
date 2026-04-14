import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { PartyMember } from '../../party-members/entities/party-member.entity';
import { User } from '../../users/entities/user.entity';
import { FeeStatusEnum } from 'src/common/enums';

@Entity('party_fees')
@Unique(['memberId', 'month', 'year'])
export class PartyFee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => PartyMember, (member) => member.partyFees, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column()
  month: number;

  @Column()
  year: number;

  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  amount: number;

  @Column({ type: 'enum', enum: FeeStatusEnum, default: FeeStatusEnum.PENDING })
  status: FeeStatusEnum;

  @Column({ name: 'payment_date', type: 'timestamp', nullable: true })
  paymentDate: Date;

  @Column({ name: 'recorded_by', nullable: true })
  recordedById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recorded_by' })
  recordedBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
