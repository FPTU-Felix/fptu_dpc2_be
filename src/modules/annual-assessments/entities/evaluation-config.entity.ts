import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PartyCell } from '../../party-cells/entities/party-cell.entity';

@Entity('evaluation_configs')
@Unique(['partyCellId', 'year'])
export class EvaluationConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'party_cell_id', type: 'uuid' })
  partyCellId: string;

  @ManyToOne(() => PartyCell, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_cell_id' })
  partyCell: PartyCell;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'jsonb', name: 'criteria_template', default: [] })
  criteriaTemplate: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
