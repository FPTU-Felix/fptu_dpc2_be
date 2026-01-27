import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PartyMember } from './party-member.entity';

export enum AdmissionStepEnum {
  STEP_1_INTRO = 'STEP_1_INTRO',
  STEP_2_TRAINING = 'STEP_2_TRAINING',
  STEP_3_FILE_PREP = 'STEP_3_FILE_PREP',
  STEP_4_VERIFICATION = 'STEP_4_VERIFICATION',
  STEP_5_ADMISSION = 'STEP_5_ADMISSION',
  STEP_6_OFFICIAL = 'STEP_6_OFFICIAL',
}

@Entity('admission_progress')
export class AdmissionProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => PartyMember, (member) => member.admissionProgress, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'member_id' })
  member: PartyMember;

  @Column({ type: 'enum', enum: AdmissionStepEnum })
  step: AdmissionStepEnum;

  @Column({ name: 'is_completed', default: false })
  isCompleted: boolean;

  @Column({ name: 'completion_date', type: 'timestamp', nullable: true })
  completionDate: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
