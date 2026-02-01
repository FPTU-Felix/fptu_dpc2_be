import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PartyCell } from '../../party-cells/entities/party-cell.entity';
import { AdmissionProgress } from './admission-progress.entity';
import { PartyFee } from 'src/modules/party-fees/entities/party-fee.entity';
import { AnnualAssessment } from 'src/modules/annual-assessments/entities/annual-assessment.entity';
import { Commendation } from 'src/modules/commendations/entities/commendation.entity';
import { Discipline } from 'src/modules/disciplines/entities/discipline.entity';
import { PartyMemberPosition } from 'src/modules/party-positions/entities/party-member-position.entity';

export enum MemberStatusEnum {
  MASSES = 'MASSES',
  POTENTIAL = 'POTENTIAL',
  RESERVE = 'RESERVE',
  OFFICIAL = 'OFFICIAL',
  TRANSFERRED = 'TRANSFERRED',
  DELETED = 'DELETED',
}

export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

@Entity('party_members')
export class PartyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @OneToOne(() => User, (user) => user.member)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'party_cell_id' })
  partyCellId: string;

  @ManyToOne(() => PartyCell, (cell) => cell.members)
  @JoinColumn({ name: 'party_cell_id' })
  partyCell: PartyCell;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'timestamp', nullable: true })
  dob: Date;

  @Column({ type: 'enum', enum: GenderEnum, nullable: true })
  gender: GenderEnum;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  hometown: string;

  @Column({ name: 'permanent_address', nullable: true })
  permanentAddress: string;

  @Column({ name: 'join_date', type: 'timestamp', nullable: true })
  joinDate: Date;

  @Column({ name: 'official_date', type: 'timestamp', nullable: true })
  officialDate: Date;

  @Column({ name: 'party_card_id', nullable: true })
  partyCardId: string;

  @Column({
    type: 'enum',
    enum: MemberStatusEnum,
    default: MemberStatusEnum.MASSES,
  })
  status: MemberStatusEnum;

  @OneToMany(() => AdmissionProgress, (progress) => progress.member)
  admissionProgress: AdmissionProgress[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Discipline, (discipline) => discipline.member)
  disciplines: Discipline[];

  @OneToMany(() => AnnualAssessment, (assessment) => assessment.member)
  annualAssessments: AnnualAssessment[];

  @OneToMany(() => Commendation, (commendation) => commendation.member)
  commendations: Commendation[];

  @OneToMany(() => PartyFee, (fee) => fee.member)
  partyFees: PartyFee[];

  @OneToMany(() => PartyMemberPosition, (pos) => pos.member)
  positions: PartyMemberPosition[];
}
