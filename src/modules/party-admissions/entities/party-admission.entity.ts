import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity'; // Giả định đường dẫn tới entity User của bạn
import { PartyCell } from '../../party-cells/entities/party-cell.entity';
import { AdmissionStatusEnum } from 'src/common/enums';

@Entity('party_admissions')
export class PartyAdmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'party_cell_id' })
  partyCellId: string;

  @ManyToOne(() => PartyCell)
  @JoinColumn({ name: 'party_cell_id' })
  partyCell: PartyCell;

  @Column({
    type: 'enum',
    enum: AdmissionStatusEnum,
    default: AdmissionStatusEnum.CHECKED,
  })
  status: AdmissionStatusEnum;

  @Column({ name: 'admission_documents_url', nullable: true })
  admissionDocumentsUrl: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}