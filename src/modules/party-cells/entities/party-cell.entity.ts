import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PartyMember } from '../../party-members/entities/party-member.entity';
import { Meeting } from '../../meetings/entities/meeting.entity';
import { EvaluationConfig } from 'src/modules/annual-assessments/entities/evaluation-config.entity';

@Entity('party_cells')
export class PartyCell {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true, nullable: true })
  code: string;

  @Column({ nullable: true })
  address: string;

  @OneToMany(() => PartyMember, (member) => member.partyCell)
  members: PartyMember[];

  @OneToMany(() => Meeting, (meeting) => meeting.partyCell)
  meetings: Meeting[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => EvaluationConfig, (config) => config.partyCell)
  evaluationConfigs: EvaluationConfig[];
}
