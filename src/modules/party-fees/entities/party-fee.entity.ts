import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PartyMember } from '../../party-members/entities/party-member.entity';

export enum FeeStatusEnum {
  PAID = 'PAID',
  PENDING = 'PENDING',
  EXEMPTED = 'EXEMPTED',
}

@Entity('party_fees')
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

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  amount: number; // Số tiền

  @Column({ type: 'enum', enum: FeeStatusEnum, default: FeeStatusEnum.PENDING })
  status: FeeStatusEnum;

  @Column({ name: 'payment_date', type: 'timestamp', nullable: true })
  paymentDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
