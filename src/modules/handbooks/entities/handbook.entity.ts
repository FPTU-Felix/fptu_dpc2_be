import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { HandbookLink } from './handbook-link.entity';

@Entity('handbooks')
export class Handbook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => HandbookLink, (link) => link.handbook)
  links: HandbookLink[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
