import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { PartyMemberPosition } from './party-member-position.entity';

@Entity('party_positions')
export class PartyPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // Ví dụ: Bí thư, Phó Bí thư, Chi ủy viên

  @Column({ unique: true, nullable: true })
  code: string; // Ví dụ: SECRETARY, DEPUTY_SECRETARY... (Dùng để code check logic)

  @Column({ nullable: true })
  description: string;

  // Quan hệ 1-N với bảng lịch sử
  @OneToMany(() => PartyMemberPosition, (history) => history.position)
  positionHistory: PartyMemberPosition[];
}
