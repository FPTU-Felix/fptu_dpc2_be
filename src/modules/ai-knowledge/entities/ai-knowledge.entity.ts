import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PartyCell } from '../../party-cells/entities/party-cell.entity';
import { AiDataStatus } from 'src/common/enums';

@Entity('ai_knowledge_base')
export class AiKnowledge {
  @PrimaryGeneratedColumn('uuid') //
  id: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'file_url', type: 'varchar', nullable: true })
  fileUrl: string;

  @Column({
    type: 'enum',
    enum: AiDataStatus,
    default: AiDataStatus.PENDING,
  })
  status: AiDataStatus;

  @Column({ name: 'party_cell_id' })
  partyCellId: string;

  @ManyToOne(() => PartyCell)
  @JoinColumn({ name: 'party_cell_id' })
  partyCell: PartyCell;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
